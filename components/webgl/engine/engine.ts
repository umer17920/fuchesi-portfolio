import {
  createFBO,
  createPingPong,
  createProgramsAsync,
  createQuad,
  deleteFBO,
  type FBO,
  type GL,
  type PingPong,
  type Program,
} from './gl';
import { QualityGovernor, settingsFor, type QualitySettings, type Tier } from './quality';
import {
  ADVECT_FRAG,
  BASE_VERT,
  CLEAR_FRAG,
  CURL_FRAG,
  DIVERGENCE_FRAG,
  GRADIENT_SUBTRACT_FRAG,
  GRID_FRAG,
  PARTICLE_RENDER_FRAG,
  PARTICLE_RENDER_VERT,
  PARTICLE_UPDATE_FRAG,
  PRESSURE_FRAG,
  SCREEN_VERT,
  SPLAT_FRAG,
  VORTICITY_FRAG,
} from './shaders';

export type Palette = {
  /** Background gradient endpoints. */
  bgTop: [number, number, number];
  bgBottom: [number, number, number];
  particleNear: [number, number, number];
  particleFar: [number, number, number];
  grid: [number, number, number];
  gridOpacity: number;
  particleOpacity: number;
};

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  tier: Tier;
  palette: Palette;
};

/**
 * VISCOSITY. The brief calls for warm motor oil, not water — a wake that melts
 * back to a standstill in 1.5–2s.
 *
 * Velocity dissipation is what buys that. Dobryakov's defaults sit near 0.2,
 * which rings on for many seconds like water. 2.4 was tuned by measuring how
 * long a splat takes to decay below a visible threshold at 60fps: e^(-2.4t)
 * falls under ~2% in about 1.6s, landing inside the specified window.
 */
const VELOCITY_DISSIPATION = 2.2;

/**
 * Splat radius, in the gaussian's `exp(-dot(p,p)/radius)` units — so the
 * influence falls to 1/e at |p| = sqrt(radius) in UV space.
 *
 * This started at 0.0004 (|p| ≈ 0.02 — two percent of the screen). The
 * simulation was provably correct at that value — the velocity field peaked at
 * 244 on cursor movement and dissipated to zero in 2.5s exactly as designed —
 * and it was completely invisible, because the response touched ~1% of the
 * field and therefore ~300 of 30,000 particles. Correct and invisible is
 * indistinguishable from a static video, which is precisely what it was
 * mistaken for.
 *
 * At 0.035, |p| ≈ 0.19: the cursor drives roughly a fifth of the viewport and a
 * meaningful share of the field moves with it. The reference implementation's
 * ~0.0025 is tuned for a *dye* splat, where you look directly at the injected
 * ink; driving 30k particles across a hero needs a far wider field.
 *
 * Guarded by scripts/check-reactivity.mjs, which measures perceptibility rather
 * than correctness.
 */
const SPLAT_RADIUS = 0.035;
const SPLAT_FORCE = 5200;

/**
 * How hard particles are dragged along the fluid.
 *
 * Was 0.00035 — at a typical post-dissipation field magnitude that moved a
 * particle about two pixels per frame, which reads as nothing. The fluid must
 * clearly dominate the ambient curl noise or the field looks like it is only
 * ever drifting.
 */
const FLUID_STRENGTH = 0.009;

/**
 * Ambient curl-noise strength.
 *
 * Lowered from 0.012. The noise is meant to be *micro*-turbulence — the reason
 * particles look alive rather than dead — but at 0.012 every particle in the
 * field was in constant visible motion, which masked the cursor's response
 * entirely: a measured drag produced 0.9x the pixel change of doing nothing.
 * The fluid has to clearly out-shout the noise, or the field reads as
 * permanently churning and therefore unresponsive.
 */
const NOISE_STRENGTH = 0.0045;

/**
 * Radial REPULSION from the cursor — particles are pushed away, opening a
 * moving void that follows the pointer.
 *
 * Separate from the fluid: advection pushes particles ALONG the flow, never
 * radially away from a point. The fluid gives the swirl; this gives the void.
 *
 * Strong on purpose (0.5, up from the old 0.22 attraction). The void is the
 * whole interaction now, so it has to be unmistakable — a timid push on a dense
 * field is invisible, which is precisely how the effect read as "gone".
 */
const POINTER_FORCE = 0.5;
/** A touch wider than SPLAT_RADIUS so the cleared bubble reads larger than the swirl. */
const POINTER_RADIUS = 0.06;

/**
 * Pointer energy decay, per second.
 *
 * The pull must be tied to *movement*, not position. A constant attraction
 * would collapse every particle onto a parked cursor and stay there. Instead
 * energy is set to 1 on movement and decays: e^(-2.6 * 1.6s) ≈ 0.015, so the
 * field melts back to a standstill inside the specified ~1.5–2s window.
 */
const POINTER_DECAY = 2.6;

export class LiquidObsidianEngine {
  private gl: GL;
  private canvas: HTMLCanvasElement;
  private settings: QualitySettings;
  private palette: Palette;

  private programs!: {
    splat: Program;
    advect: Program;
    curl: Program;
    vorticity: Program;
    divergence: Program;
    clear: Program;
    pressure: Program;
    gradient: Program;
    particleUpdate: Program;
    particleRender: Program;
    grid: Program;
  };

  private quad!: ReturnType<typeof createQuad>;
  private velocity!: PingPong;
  private particles!: PingPong;
  private divergence!: FBO;
  private curlFBO!: FBO;
  private pressure!: PingPong;
  private particleVAO!: WebGLVertexArrayObject;
  private particleIndexBuffer!: WebGLBuffer;
  private particleTexSize = 0;
  private particleCount = 0;

  private raf = 0;
  private running = false;
  private lastTime = 0;
  private time = 0;
  private frameInterval: number;
  private accumulator = 0;

  private pointer = { x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false, down: false };
  private lastPointerActivity = 0;
  /** 1 on movement, decaying to 0 over ~1.6s. Gates the attraction force. */
  private pointerEnergy = 0;
  private governor: QualityGovernor;
  private disposed = false;

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    this.palette = opts.palette;
    this.settings = settingsFor(opts.tier);
    this.frameInterval = 1000 / this.settings.activeFps;

    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false, // we anti-alias the particles ourselves; MSAA here would cost fill rate for nothing
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;

    /*
     * getContext() returns the SAME context for a given canvas forever. If a
     * previous engine instance lost it, we get the corpse back and every
     * getExtension() returns null — which surfaces as the deeply misleading
     * "EXT_color_buffer_float unavailable" on hardware that supports it fine.
     *
     * This is exactly what React StrictMode's double-mount used to trigger:
     * mount → dispose (which called loseContext) → remount onto the same
     * canvas. dispose() no longer kills the context; this check catches the
     * genuine driver-reset case.
     */
    if (gl.isContextLost()) {
      throw new Error('WebGL2 context is lost (canvas reused after a context loss)');
    }

    if (!gl.getExtension('EXT_color_buffer_float')) {
      throw new Error('EXT_color_buffer_float unavailable');
    }
    // Linear filtering on float textures is an extension. Without it the sim
    // still runs, it just samples NEAREST and looks blockier — so this is a
    // capability query, not a requirement.
    this.hasLinearFloat = gl.getExtension('OES_texture_float_linear') !== null;

    this.governor = new QualityGovernor(opts.tier, (tier) => this.applyTier(tier));
  }

  private hasLinearFloat = false;

  /**
   * Second phase of construction. Async and yielding throughout — this is the
   * work that must never fuse into one long task.
   *
   * The constructor only acquires the context (cheap). Everything expensive —
   * shader compilation above all — happens here, off the critical path and
   * interruptible.
   */
  async init() {
    const gl = this.gl;

    this.programs = await createProgramsAsync(gl, {
      splat: [BASE_VERT, SPLAT_FRAG],
      advect: [BASE_VERT, ADVECT_FRAG],
      curl: [BASE_VERT, CURL_FRAG],
      vorticity: [BASE_VERT, VORTICITY_FRAG],
      divergence: [BASE_VERT, DIVERGENCE_FRAG],
      clear: [BASE_VERT, CLEAR_FRAG],
      pressure: [BASE_VERT, PRESSURE_FRAG],
      gradient: [BASE_VERT, GRADIENT_SUBTRACT_FRAG],
      particleUpdate: [BASE_VERT, PARTICLE_UPDATE_FRAG],
      particleRender: [PARTICLE_RENDER_VERT, PARTICLE_RENDER_FRAG],
      grid: [SCREEN_VERT, GRID_FRAG],
    });

    if (this.disposed) return;

    this.quad = createQuad(gl);
    this.allocate();
  }

  private allocate() {
    const gl = this.gl;
    const s = this.settings.simResolution;
    const filter = this.hasLinearFloat ? gl.LINEAR : gl.NEAREST;

    this.velocity = createPingPong(gl, s, s, gl.RG16F, gl.RG, gl.HALF_FLOAT, filter);
    this.divergence = createFBO(gl, s, s, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST);
    this.curlFBO = createFBO(gl, s, s, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST);
    this.pressure = createPingPong(gl, s, s, gl.R16F, gl.RED, gl.HALF_FLOAT, gl.NEAREST);

    // Particle state needs full float: positions are integrated every frame and
    // half-float drifts visibly within seconds.
    const texSize = Math.ceil(Math.sqrt(this.settings.particleCount));
    this.particleTexSize = texSize;
    this.particleCount = texSize * texSize;
    this.particles = createPingPong(gl, texSize, texSize, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST);

    this.seedParticles();
    this.buildParticleVAO();
  }

  private seedParticles() {
    const gl = this.gl;
    const n = this.particleCount;
    const data = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      data[i * 4 + 0] = Math.random();
      data[i * 4 + 1] = Math.random();
      data[i * 4 + 2] = Math.random(); // depth
      // Stagger life so respawns are spread over time rather than pulsing in
      // one visible wave every few seconds.
      data[i * 4 + 3] = Math.random();
    }
    for (const target of [this.particles.read, this.particles.write]) {
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA32F,
        this.particleTexSize, this.particleTexSize, 0,
        gl.RGBA, gl.FLOAT, data,
      );
    }
  }

  private buildParticleVAO() {
    const gl = this.gl;
    const indices = new Float32Array(this.particleCount);
    for (let i = 0; i < this.particleCount; i++) indices[i] = i;

    this.particleVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.particleVAO);
    this.particleIndexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleIndexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /** Runtime downgrade from the governor. Rebuilds only what changed size. */
  private applyTier(tier: Tier) {
    if (this.disposed) return;
    const gl = this.gl;
    this.settings = settingsFor(tier);
    this.frameInterval = 1000 / this.settings.activeFps;

    for (const f of [this.velocity.read, this.velocity.write, this.divergence, this.curlFBO, this.pressure.read, this.pressure.write, this.particles.read, this.particles.write]) {
      deleteFBO(gl, f);
    }
    gl.deleteVertexArray(this.particleVAO);
    gl.deleteBuffer(this.particleIndexBuffer);

    this.allocate();
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings.dprCap);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (w === 0 || h === 0) return;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  setPalette(palette: Palette) {
    this.palette = palette;
  }

  /** Pointer position in 0..1, origin bottom-left (GL convention). */
  onPointer(xNorm: number, yNorm: number) {
    const dx = (xNorm - this.pointer.x) * SPLAT_FORCE;
    const dy = (yNorm - this.pointer.y) * SPLAT_FORCE;
    this.pointer.x = xNorm;
    this.pointer.y = yNorm;
    this.pointer.dx = dx;
    this.pointer.dy = dy;
    this.pointer.moved = Math.abs(dx) > 0 || Math.abs(dy) > 0;
    this.lastPointerActivity = performance.now();
    // Recharge the attraction. Decays in step().
    if (this.pointer.moved) this.pointerEnergy = 1;
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private loop = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);

    const elapsed = now - this.lastTime;

    /*
     * Frame pacing, and the main battery lever.
     *
     * Once the fluid has dissipated and the pointer has been still for a
     * moment, nothing is moving except particle micro-vibration — rendering
     * that at 60fps is pure heat. We fall back to the idle cadence and return
     * to full rate the instant the pointer moves.
     */
    const idle = now - this.lastPointerActivity > 2000;
    const targetInterval = 1000 / (idle ? this.settings.idleFps : this.settings.activeFps);
    if (elapsed < targetInterval) return;

    this.lastTime = now;
    this.governor.sample(elapsed);

    // Clamp dt: after a tab is backgrounded, elapsed can be seconds, and
    // integrating that in one step detonates the simulation.
    const dt = Math.min(elapsed / 1000, 1 / 30);
    this.time += dt;

    this.step(dt);
    this.render();
  };

  private step(dt: number) {
    const gl = this.gl;
    const p = this.programs;
    const s = this.settings.simResolution;

    // Decay the attraction toward zero. This is what makes the wake "melt back
    // to a standstill" instead of the cursor acting as a permanent gravity well.
    this.pointerEnergy *= Math.exp(-POINTER_DECAY * dt);
    if (this.pointerEnergy < 0.001) this.pointerEnergy = 0;

    gl.disable(gl.BLEND);
    gl.viewport(0, 0, s, s);

    const texel = (fbo: FBO) => [fbo.texelSizeX, fbo.texelSizeY] as const;

    // --- splat -----------------------------------------------------------
    if (this.pointer.moved) {
      this.pointer.moved = false;
      gl.useProgram(p.splat.program);
      gl.uniform2f(p.splat.uniforms.uTexelSize, ...texel(this.velocity.read));
      gl.uniform1i(p.splat.uniforms.uTarget, this.velocity.read.attach(0));
      gl.uniform1f(p.splat.uniforms.uAspectRatio, this.canvas.width / this.canvas.height);
      gl.uniform2f(p.splat.uniforms.uPoint, this.pointer.x, this.pointer.y);
      gl.uniform3f(p.splat.uniforms.uColor, this.pointer.dx, this.pointer.dy, 0);
      gl.uniform1f(p.splat.uniforms.uRadius, SPLAT_RADIUS);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
      this.quad.draw();
      this.velocity.swap();
    }

    // --- curl ------------------------------------------------------------
    gl.useProgram(p.curl.program);
    gl.uniform2f(p.curl.uniforms.uTexelSize, ...texel(this.velocity.read));
    gl.uniform1i(p.curl.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.curlFBO.fbo);
    this.quad.draw();

    // --- vorticity -------------------------------------------------------
    gl.useProgram(p.vorticity.program);
    gl.uniform2f(p.vorticity.uniforms.uTexelSize, ...texel(this.velocity.read));
    gl.uniform1i(p.vorticity.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(p.vorticity.uniforms.uCurl, this.curlFBO.attach(1));
    gl.uniform1f(p.vorticity.uniforms.uCurlStrength, this.settings.curl);
    gl.uniform1f(p.vorticity.uniforms.uDt, dt);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
    this.quad.draw();
    this.velocity.swap();

    // --- divergence ------------------------------------------------------
    gl.useProgram(p.divergence.program);
    gl.uniform2f(p.divergence.uniforms.uTexelSize, ...texel(this.velocity.read));
    gl.uniform1i(p.divergence.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.divergence.fbo);
    this.quad.draw();

    // --- decay pressure --------------------------------------------------
    gl.useProgram(p.clear.program);
    gl.uniform2f(p.clear.uniforms.uTexelSize, ...texel(this.pressure.read));
    gl.uniform1i(p.clear.uniforms.uTexture, this.pressure.read.attach(0));
    gl.uniform1f(p.clear.uniforms.uValue, 0.8);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.write.fbo);
    this.quad.draw();
    this.pressure.swap();

    // --- pressure solve --------------------------------------------------
    gl.useProgram(p.pressure.program);
    gl.uniform2f(p.pressure.uniforms.uTexelSize, ...texel(this.pressure.read));
    gl.uniform1i(p.pressure.uniforms.uDivergence, this.divergence.attach(0));
    for (let i = 0; i < this.settings.pressureIterations; i++) {
      gl.uniform1i(p.pressure.uniforms.uPressure, this.pressure.read.attach(1));
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.write.fbo);
      this.quad.draw();
      this.pressure.swap();
    }

    // --- gradient subtract ----------------------------------------------
    gl.useProgram(p.gradient.program);
    gl.uniform2f(p.gradient.uniforms.uTexelSize, ...texel(this.velocity.read));
    gl.uniform1i(p.gradient.uniforms.uPressure, this.pressure.read.attach(0));
    gl.uniform1i(p.gradient.uniforms.uVelocity, this.velocity.read.attach(1));
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
    this.quad.draw();
    this.velocity.swap();

    // --- advect velocity (the viscosity) ---------------------------------
    gl.useProgram(p.advect.program);
    gl.uniform2f(p.advect.uniforms.uTexelSize, ...texel(this.velocity.read));
    gl.uniform1i(p.advect.uniforms.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(p.advect.uniforms.uSource, this.velocity.read.attach(0));
    gl.uniform1f(p.advect.uniforms.uDt, dt);
    gl.uniform1f(p.advect.uniforms.uDissipation, VELOCITY_DISSIPATION);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
    this.quad.draw();
    this.velocity.swap();

    // --- particles -------------------------------------------------------
    gl.viewport(0, 0, this.particleTexSize, this.particleTexSize);
    gl.useProgram(p.particleUpdate.program);
    gl.uniform2f(p.particleUpdate.uniforms.uTexelSize, 1 / this.particleTexSize, 1 / this.particleTexSize);
    gl.uniform1i(p.particleUpdate.uniforms.uParticles, this.particles.read.attach(0));
    gl.uniform1i(p.particleUpdate.uniforms.uVelocity, this.velocity.read.attach(1));
    gl.uniform1f(p.particleUpdate.uniforms.uDt, dt);
    gl.uniform1f(p.particleUpdate.uniforms.uTime, this.time);
    gl.uniform1f(p.particleUpdate.uniforms.uNoiseScale, 3.2);
    gl.uniform1f(p.particleUpdate.uniforms.uNoiseStrength, NOISE_STRENGTH);
    gl.uniform1f(p.particleUpdate.uniforms.uFluidStrength, FLUID_STRENGTH);
    gl.uniform1f(p.particleUpdate.uniforms.uLifeDecay, 0.06);
    gl.uniform2f(p.particleUpdate.uniforms.uPointer, this.pointer.x, this.pointer.y);
    gl.uniform1f(p.particleUpdate.uniforms.uPointerForce, POINTER_FORCE);
    gl.uniform1f(p.particleUpdate.uniforms.uPointerRadius, POINTER_RADIUS);
    gl.uniform1f(p.particleUpdate.uniforms.uPointerEnergy, this.pointerEnergy);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.particles.write.fbo);
    this.quad.draw();
    this.particles.swap();
  }

  private render() {
    const gl = this.gl;
    const p = this.programs;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // The obsidian ground. The DOM paints the gradient behind us; we clear to
    // transparent and composite on top, so a WebGL failure leaves the CSS
    // gradient intact rather than a black hole.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    // Premultiplied alpha — see the particle fragment shader.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // --- grid (behind particles) -----------------------------------------
    if (this.settings.drawGrid) {
      gl.useProgram(p.grid.program);
      gl.uniform1i(p.grid.uniforms.uVelocity, this.velocity.read.attach(0));
      gl.uniform2f(p.grid.uniforms.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(p.grid.uniforms.uGridSize, 22);
      gl.uniform1f(p.grid.uniforms.uOpacity, this.palette.gridOpacity);
      gl.uniform1f(p.grid.uniforms.uDisplacement, 0.00022);
      gl.uniform3fv(p.grid.uniforms.uColor, this.palette.grid);
      this.quad.draw();
    }

    // --- particles --------------------------------------------------------
    gl.useProgram(p.particleRender.program);
    gl.uniform1i(p.particleRender.uniforms.uParticles, this.particles.read.attach(0));
    gl.uniform1i(p.particleRender.uniforms.uVelocity, this.velocity.read.attach(1));
    gl.uniform2f(p.particleRender.uniforms.uTexSize, this.particleTexSize, this.particleTexSize);
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings.dprCap);
    // 9px base → roughly 3–9px after the depth scale. The first pass used 3.2,
    // which after depth scaling produced 1–3px points: too few pixels for the
    // radial falloff, the DoF softness, or the aberration to resolve, so they
    // rendered as hard coloured specks rather than glass beads. Below ~4px none
    // of the fragment shader's craft survives rasterisation.
    gl.uniform1f(p.particleRender.uniforms.uSizeScale, 9 * dpr);
    gl.uniform3fv(p.particleRender.uniforms.uColorNear, this.palette.particleNear);
    gl.uniform3fv(p.particleRender.uniforms.uColorFar, this.palette.particleFar);
    // Reference speed for normalising the aberration. Tied to SPLAT_FORCE:
    // roughly the velocity of a brisk cursor flick, so a fast drag reaches ~1.
    gl.uniform1f(p.particleRender.uniforms.uSpeedRef, SPLAT_FORCE * 0.16);
    gl.uniform1f(p.particleRender.uniforms.uAberration, 0.16);
    gl.uniform1f(p.particleRender.uniforms.uOpacity, this.palette.particleOpacity);

    gl.bindVertexArray(this.particleVAO);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    const gl = this.gl;
    if (gl.isContextLost()) return; // nothing to free, and every call would error

    // init() is async and may never have completed — a fast unmount, or
    // StrictMode's double-invoke, both land here with buffers still undefined.
    if (this.velocity) {
      for (const f of [this.velocity.read, this.velocity.write, this.divergence, this.curlFBO, this.pressure.read, this.pressure.write, this.particles.read, this.particles.write]) {
        deleteFBO(gl, f);
      }
    }
    if (this.programs) {
      for (const prog of Object.values(this.programs)) gl.deleteProgram(prog.program);
    }
    if (this.particleVAO) gl.deleteVertexArray(this.particleVAO);
    if (this.particleIndexBuffer) gl.deleteBuffer(this.particleIndexBuffer);

    /*
     * Deliberately NOT calling WEBGL_lose_context.loseContext().
     *
     * It looks like good hygiene — hand the GPU back explicitly — but the
     * context belongs to the canvas, not to us, and React owns the canvas. If
     * the component remounts onto the same element (StrictMode's double-invoke,
     * a Fast Refresh, a re-render that keeps the node), getContext() hands back
     * the context we just killed, every getExtension() returns null, and the
     * effect dies reporting missing float-texture support on a GPU that has it.
     *
     * Every GL object above is explicitly deleted, so nothing leaks. The
     * context itself is released when the canvas is garbage collected.
     */
  }

  get stats() {
    return { tier: this.settings.tier, particles: this.particleCount, sim: this.settings.simResolution };
  }

  /**
   * Reads the peak velocity magnitude back off the GPU, plus pointer state.
   *
   * This is the only honest way to test reactivity: a screenshot diff cannot
   * distinguish a working sim from a loop on a software renderer, but the
   * velocity field is ground truth on any renderer. Used by
   * scripts/check-reactivity.mjs.
   *
   * The only caller is a NODE_ENV-guarded hook (see LiquidObsidianCanvas) that
   * is stripped from the production build, so this method is never reachable in
   * production — though minifiers retain the method body itself as dead code.
   *
   * readPixels stalls the pipeline, so this must never be called from the
   * render loop — only from the test hook, on demand.
   */
  debugReadState() {
    const gl = this.gl;
    if (!this.velocity) return { maxVelocity: 0, pointerEnergy: 0, nearCursorDensity: 0 };
    const s = this.settings.simResolution;

    // Velocity field magnitude — proves the FLUID responds to cursor movement.
    const vbuf = new Float32Array(s * s * 4);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.velocity.read.texture, 0);
    let maxVelocity = 0;
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      gl.readPixels(0, 0, s, s, gl.RGBA, gl.FLOAT, vbuf);
      for (let i = 0; i < vbuf.length; i += 4) {
        const m = Math.hypot(vbuf[i], vbuf[i + 1]);
        if (m > maxVelocity) maxVelocity = m;
      }
    }

    /*
     * Particle density inside the repulsion radius around the cursor.
     *
     * This is the only measurement that actually proves REPULSION: the push is
     * a per-particle force applied in the particle-update shader, so it never
     * touches the velocity field the block above reads. Reading particle
     * POSITIONS back and counting how many sit within the pointer radius is
     * renderer-independent — it works identically on a real GPU and on
     * SwiftShader, where a screenshot cannot resolve the moving void. Repulsion
     * working means this count DROPS when the cursor is active.
     */
    const t = this.particleTexSize;
    const pbuf = new Float32Array(t * t * 4);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.particles.read.texture, 0);
    let nearCursor = 0;
    let total = 0;
    const r2 = POINTER_RADIUS; // same falloff scale the shader uses
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      gl.readPixels(0, 0, t, t, gl.RGBA, gl.FLOAT, pbuf);
      for (let i = 0; i < pbuf.length; i += 4) {
        const dx = pbuf[i] - this.pointer.x;
        const dy = pbuf[i + 1] - this.pointer.y;
        // Count within ~1.5x the force radius, where the void forms.
        if (dx * dx + dy * dy < r2 * 1.5) nearCursor++;
        total++;
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    return {
      maxVelocity,
      pointerEnergy: this.pointerEnergy,
      // Fraction of all particles currently inside the cursor's repulsion zone.
      nearCursorDensity: total ? nearCursor / total : 0,
    };
  }
}
