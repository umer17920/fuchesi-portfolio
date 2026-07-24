/**
 * Minimal WebGL2 helpers: programs, float render targets, ping-pong buffers.
 *
 * WebGL2 only, no fallback to WebGL1. The simulation needs float render targets
 * and integer texel fetch; emulating that on WebGL1 means packing floats into
 * RGBA8, which is slow, imprecise, and would fail exactly the "minimum battery"
 * goal on the weak devices that lack WebGL2 in the first place. Those devices
 * get the static site instead — see supportsWebGL2().
 */

export type GL = WebGL2RenderingContext;

export type Program = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
};

export type FBO = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (unit: number) => number;
};

export type PingPong = {
  read: FBO;
  write: FBO;
  swap: () => void;
};

/**
 * Probe support without leaking a context.
 *
 * Creating a WebGL context is not free and browsers cap how many can exist, so
 * this creates one, asks the questions, and explicitly loses it.
 */
export function supportsWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    // Float render targets are non-negotiable for the sim.
    const ok = gl.getExtension('EXT_color_buffer_float') !== null;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Compile without stalling.
 *
 * Deliberately does NOT query COMPILE_STATUS. That query forces the driver to
 * finish compiling synchronously on the calling thread — with eleven programs
 * (one carrying the full simplex noise implementation) that measured as a
 * single 1068ms main-thread block on throttled mobile, which alone took TBT
 * from 80ms to 1520ms. Status is checked later, after
 * KHR_parallel_shader_compile reports completion.
 */
function compileAsync(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function assertCompiled(gl: GL, shader: WebGLShader, source: string) {
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    // Fail loudly with the driver's own message — a silently black canvas is
    // the worst possible outcome to debug.
    throw new Error(`Shader compile failed:\n${log}\n\n${withLineNumbers(source)}`);
  }
}

function withLineNumbers(src: string) {
  return src
    .split('\n')
    .map((l, i) => `${String(i + 1).padStart(3)} | ${l}`)
    .join('\n');
}

function finalize(gl: GL, program: WebGLProgram, vs: WebGLShader, fs: WebGLShader, vSrc: string, fSrc: string): Program {
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    // Only now is it worth paying for the per-shader status, and only to
    // produce a useful message.
    assertCompiled(gl, vs, vSrc);
    assertCompiled(gl, fs, fSrc);
    throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  // Attached shaders are retained by the program; drop our references.
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  // Cache every active uniform up front so the render loop never calls
  // getUniformLocation (which is a string lookup into the driver, per frame).
  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    // Array uniforms report as "name[0]"; store under the bare name.
    const name = info.name.replace(/\[0\]$/, '');
    const loc = gl.getUniformLocation(program, info.name);
    if (loc) uniforms[name] = loc;
  }

  return { program, uniforms };
}

/**
 * Compiles and links a batch of programs without blocking the main thread.
 *
 * Every shader is handed to the driver first, then we poll
 * KHR_parallel_shader_compile's COMPLETION_STATUS_KHR — the one query that does
 * NOT force a stall — yielding between polls. The driver does the work on its
 * own threads while the page stays responsive.
 *
 * Without the extension we still win: linking everything before querying any
 * status lets drivers overlap the work internally, and the per-program status
 * checks are spread across frames rather than fused into one long task.
 */
export async function createProgramsAsync<K extends string>(
  gl: GL,
  specs: Record<K, [vert: string, frag: string]>,
): Promise<Record<K, Program>> {
  const ext = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null;

  const pending = (Object.entries(specs) as [K, [string, string]][]).map(([key, [vSrc, fSrc]]) => {
    const vs = compileAsync(gl, gl.VERTEX_SHADER, vSrc);
    const fs = compileAsync(gl, gl.FRAGMENT_SHADER, fSrc);
    const program = gl.createProgram();
    if (!program) throw new Error('createProgram failed');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    return { key, program, vs, fs, vSrc, fSrc };
  });

  if (ext) {
    // Poll until the driver says every program is done. Yielding on rAF keeps
    // each turn trivially short.
    const ready = () =>
      pending.every((p) => gl.getProgramParameter(p.program, ext.COMPLETION_STATUS_KHR) === true);
    const deadline = performance.now() + 10000; // never hang the page on a broken driver
    while (!ready() && performance.now() < deadline) {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  }

  // Finalise one program per turn, so even the non-parallel path never fuses
  // into a single long task.
  const out = {} as Record<K, Program>;
  for (const p of pending) {
    out[p.key] = finalize(gl, p.program, p.vs, p.fs, p.vSrc, p.fSrc);
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}

export function createFBO(
  gl: GL,
  width: number,
  height: number,
  internalFormat: number,
  format: number,
  type: number,
  filter: number,
): FBO {
  const texture = gl.createTexture();
  if (!texture) throw new Error('createTexture failed');
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  // CLAMP_TO_EDGE everywhere: the sim must not wrap, or swirls teleport across
  // the viewport.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error('createFramebuffer failed');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
  }

  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return {
    texture,
    fbo,
    width,
    height,
    texelSizeX: 1 / width,
    texelSizeY: 1 / height,
    attach(unit: number) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return unit;
    },
  };
}

export function createPingPong(
  gl: GL,
  width: number,
  height: number,
  internalFormat: number,
  format: number,
  type: number,
  filter: number,
): PingPong {
  const a = createFBO(gl, width, height, internalFormat, format, type, filter);
  const b = createFBO(gl, width, height, internalFormat, format, type, filter);
  return {
    read: a,
    write: b,
    swap() {
      const t = this.read;
      this.read = this.write;
      this.write = t;
    },
  };
}

export function deleteFBO(gl: GL, f: FBO) {
  gl.deleteTexture(f.texture);
  gl.deleteFramebuffer(f.fbo);
}

/** Fullscreen triangle-pair VAO, reused by every screen-space pass. */
export function createQuad(gl: GL) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return {
    draw() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    },
  };
}
