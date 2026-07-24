/**
 * GLSL ES 3.00 sources for the Liquid Obsidian simulation.
 *
 * IMPORTANT: every source begins flush against the backtick. `#version 300 es`
 * must be the first characters of the shader — a single leading newline makes
 * the driver reject the whole program.
 *
 * The pipeline, per frame:
 *
 *   pointer → SPLAT      inject velocity where the cursor moved
 *             CURL       measure local rotation
 *             VORTICITY  feed that rotation back in (keeps swirls alive)
 *             DIVERGENCE how much the field is compressing
 *             PRESSURE   Jacobi solve, N iterations
 *             GRADIENT   subtract pressure gradient → incompressible field
 *             ADVECT     carry velocity along itself, with dissipation
 *   particles → UPDATE   integrate fluid velocity + curl noise, on the GPU
 *               RENDER   points w/ radial falloff, DoF, chromatic aberration
 *   grid      → GRID     screen-space lines, displaced by the velocity field
 */

/** Fullscreen pass vertex shader. Precomputes neighbour UVs for the stencils. */
export const BASE_VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;

out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;

uniform vec2 uTexelSize;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(uTexelSize.x, 0.0);
  vR = vUv + vec2(uTexelSize.x, 0.0);
  vT = vUv + vec2(0.0, uTexelSize.y);
  vB = vUv - vec2(0.0, uTexelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/** Injects a gaussian blob of velocity at the pointer. */
export const SPLAT_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTarget;
uniform float uAspectRatio;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;

void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`;

/**
 * Semi-Lagrangian advection.
 *
 * `uDissipation` is the viscosity control and the single most important number
 * for the brief's "heavy, viscous, like warm motor oil" requirement. It decays
 * the field every step; the engine tunes it so a swirl melts to a standstill in
 * ~1.5–2s rather than ringing on like water.
 */
export const ADVECT_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
  vec4 result = texture(uSource, coord);
  float decay = 1.0 + uDissipation * uDt;
  fragColor = result / decay;
}`;

export const CURL_FRAG = `#version 300 es
precision highp float;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;

uniform sampler2D uVelocity;

void main() {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

/**
 * Vorticity confinement — reinjects the rotation that the pressure solve and
 * numerical diffusion bleed away. Without it the fluid looks like slowly
 * spreading fog instead of liquid metal.
 */
export const VORTICITY_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;

void main() {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  // +1e-4 guards the normalise: in still fluid the gradient is exactly zero and
  // this would produce NaNs that poison the field permanently.
  force /= length(force) + 0.0001;
  force *= uCurlStrength * C;
  force.y *= -1.0;

  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity += force * uDt;
  velocity = clamp(velocity, -1000.0, 1000.0);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

export const DIVERGENCE_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;

uniform sampler2D uVelocity;

void main() {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;

  // Reflective boundaries: without these the fluid leaks off-screen and the
  // edges go visibly slack.
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }

  float div = 0.5 * (R - L + T - B);
  fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

export const CLEAR_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uValue;

void main() {
  fragColor = uValue * texture(uTexture, vUv);
}`;

/** One Jacobi iteration of the pressure solve. */
export const PRESSURE_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

export const GRADIENT_SUBTRACT_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main() {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy;
  velocity -= vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

/**
 * 3D simplex noise (Ashima / Stefan Gustavson, MIT).
 *
 * Included verbatim rather than approximated: curl noise differentiates the
 * field, and a cheaper hash-based noise has gradient discontinuities that
 * differentiation turns into visible popping.
 */
const SIMPLEX_3D = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

/**
 * Curl of a 3D simplex potential field. Divergence-free by construction, which
 * is what makes it read as turbulence rather than drift.
 *
 * Six noise evaluations. This is the most expensive thing in the frame, which
 * is exactly why particleCount is the first thing the governor cuts.
 */
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  float x0 = snoise(p - dx); float x1 = snoise(p + dx);
  float y0 = snoise(p - dy); float y1 = snoise(p + dy);
  float z0 = snoise(p - dz); float z1 = snoise(p + dz);

  // Offset sample the second potential component so the two fields decorrelate.
  vec3 q = p + vec3(31.416, 47.853, 12.793);
  float qx0 = snoise(q - dx); float qx1 = snoise(q + dx);
  float qy0 = snoise(q - dy); float qy1 = snoise(q + dy);

  float dydz = (y1 - y0) / (2.0 * e);
  float dzdy = (z1 - z0) / (2.0 * e);
  float dxdz = (x1 - x0) / (2.0 * e);
  float dqxdy = (qx1 - qx0) / (2.0 * e);
  float dqydx = (qy1 - qy0) / (2.0 * e);

  return normalize(vec3(dydz - dzdy, dxdz - dqxdy, dqydx - dydz) + 1e-6);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
`;

/**
 * GPGPU particle integration. One texel per particle: xyz = position (0..1
 * screen space, z = depth), w = life.
 */
export const PARTICLE_UPDATE_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uParticles;
uniform sampler2D uVelocity;
uniform float uDt;
uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uFluidStrength;
uniform float uLifeDecay;
uniform vec2 uPointer;
uniform float uPointerForce;
uniform float uPointerRadius;
uniform float uPointerEnergy;

${SIMPLEX_3D}

void main() {
  vec4 data = texture(uParticles, vUv);
  vec3 pos = data.xyz;
  float life = data.w;

  vec2 fluid = texture(uVelocity, pos.xy).xy;

  // Micro-turbulence: small, organic, cellular. Slow z drift animates the field
  // without moving the particles bodily through it.
  vec3 noise = curlNoise(vec3(pos.xy * uNoiseScale, uTime * 0.05 + pos.z * 2.0));

  /*
   * Repulsion FROM the cursor — particles are pushed away, carving a clear
   * moving void that tracks the pointer like a magnet's like-pole.
   *
   * The direction is (pos - pointer): away from the cursor, not toward it.
   * Repulsion reads far more strongly than attraction on a dense field —
   * clearing a visible bubble is unmistakable, where gathering particles is a
   * faint clump — which is exactly why this is the more legible interaction.
   *
   * Distinct from the fluid, which only advects particles ALONG its flow. This
   * is the radial push; the fluid supplies the swirl around the edges of the
   * void.
   *
   * Gated on uPointerEnergy, decayed to zero by the CPU ~1.6s after the last
   * movement, so the void heals and particles drift back once the cursor
   * stops — the "fades back into place" behaviour. Near particles (high z) are
   * pushed harder, so the field reads as a volume reacting, not a flat sheet.
   */
  vec2 fromPointer = pos.xy - uPointer;
  float dist2 = dot(fromPointer, fromPointer);
  float falloff = exp(-dist2 / uPointerRadius);
  float depthBias = mix(0.5, 1.0, pos.z);
  vec2 push = normalize(fromPointer + vec2(1e-6)) * uPointerForce * falloff * uPointerEnergy * depthBias;

  vec3 velocity =
      vec3(fluid * uFluidStrength, 0.0)
    + vec3(push, 0.0)
    + noise * uNoiseStrength;

  pos += velocity * uDt;

  // Depth drifts slowly so particles cross the focal plane over time.
  pos.z = fract(pos.z + uDt * 0.02);

  life -= uDt * uLifeDecay;

  bool outside = pos.x < -0.05 || pos.x > 1.05 || pos.y < -0.05 || pos.y > 1.05;
  if (life <= 0.0 || outside) {
    // Respawn somewhere new. Seeded from the texel + time so particles do not
    // all reappear in the same place.
    pos = vec3(
      hash(vUv + uTime * 0.37),
      hash(vUv.yx + uTime * 0.71),
      hash(vUv + uTime * 1.13 + 3.7)
    );
    life = 1.0;
  }

  fragColor = vec4(pos, life);
}`;

/**
 * Particle vertex shader.
 *
 * Positions come from the texture, not from an attribute buffer — the CPU never
 * touches a particle. The only per-vertex attribute is an index.
 */
export const PARTICLE_RENDER_VERT = `#version 300 es
precision highp float;

layout(location = 0) in float aIndex;

uniform sampler2D uParticles;
uniform sampler2D uVelocity;
uniform vec2 uTexSize;
uniform float uSizeScale;
uniform float uSpeedRef;

out float vDepth;
out float vLife;
out vec2 vVel;
out float vSpeed;

void main() {
  vec2 uv = (vec2(mod(aIndex, uTexSize.x), floor(aIndex / uTexSize.x)) + 0.5) / uTexSize;
  vec4 data = texture(uParticles, uv);
  vec3 pos = data.xyz;

  vLife = data.w;
  vDepth = pos.z;

  vec2 fluid = texture(uVelocity, pos.xy).xy;
  float speed = length(fluid);

  /*
   * NORMALISED, 0..1. The raw field is in simulation units and runs into the
   * hundreds near the cursor (splat force is ~5200). Passing it through raw
   * meant the fragment shader's aberration clamp saturated permanently, so
   * every particle was split into full red/blue fringes at all times and the
   * whole field read as coloured RGB noise instead of glass. The aberration is
   * supposed to appear only at speed — this is what makes it do that.
   */
  vSpeed = clamp(speed / uSpeedRef, 0.0, 1.0);
  vVel = speed > 0.0001 ? normalize(fluid) : vec2(0.0);

  gl_Position = vec4(pos.xy * 2.0 - 1.0, 0.0, 1.0);

  // Depth vector: nearer particles are larger. Squared so the falloff feels
  // like a lens rather than a linear ramp.
  float depthScale = mix(0.35, 1.0, pos.z * pos.z);
  gl_PointSize = uSizeScale * depthScale;
}`;

/**
 * Particle fragment shader — glass beads.
 *
 * Radial falloff per the spec, plus:
 *  · depth-of-field: near particles get a softer edge (shallow focal plane)
 *  · chromatic aberration: at speed, R and B split along the trailing edge
 */
export const PARTICLE_RENDER_FRAG = `#version 300 es
precision highp float;

in float vDepth;
in float vLife;
in vec2 vVel;
in float vSpeed;
out vec4 fragColor;

uniform vec3 uColorNear;
uniform vec3 uColorFar;
uniform float uAberration;
uniform float uOpacity;

float disc(vec2 c, float softness) {
  return 1.0 - smoothstep(0.5 - softness, 0.5, length(c));
}

void main() {
  vec2 c = gl_PointCoord - 0.5;

  // Shallow depth of field: particles near the camera (high z) defocus into a
  // wider, softer disc; distant ones stay tight and crisp.
  float softness = mix(0.06, 0.42, vDepth);

  // Chromatic aberration along the trailing edge. vSpeed arrives already
  // normalised to 0..1, so this is genuinely velocity-dependent: at rest the
  // three discs coincide and the bead is neutral silver; only under a fast
  // cursor do the fringes appear.
  //
  // Curved so it stays absent through most of the speed range and only blooms
  // at the top — linear made every drifting particle faintly rainbow.
  float shift = vSpeed * vSpeed * uAberration;
  vec2 dir = vVel * shift;

  float r = disc(c + dir, softness);
  float g = disc(c, softness);
  float b = disc(c - dir, softness);

  float a = g * uOpacity * vLife;
  if (a < 0.002) discard;

  // Distant particles dim and cool; near ones pick up the light.
  //
  // Quadratic, not linear. Depth is uniformly distributed, so a linear mix put
  // half the field at near-full brightness and 30k bright beads read as white
  // static rather than a deep, layered volume. Squaring keeps most particles
  // recessed and lets only the genuinely near ones catch the light — which is
  // also what gives the field its sense of depth.
  vec3 tint = mix(uColorFar, uColorNear, vDepth * vDepth);
  vec3 rgb = vec3(r, g, b) * tint;

  // Premultiplied: blending is ONE / ONE_MINUS_SRC_ALPHA, which composites
  // 30k overlapping translucent sprites without the darkening that plain
  // SRC_ALPHA blending produces where they stack.
  fragColor = vec4(rgb * a, a);
}`;

/** Trivial pass-through vertex shader for the grid (no neighbour UVs needed). */
export const SCREEN_VERT = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/**
 * Refracted grid.
 *
 * Straight screen-space lines, with the lookup displaced by the velocity field
 * — so where the fluid moves, the grid bends as if seen through thick wavy
 * glass. fwidth() keeps the lines a constant pixel width at any density,
 * instead of aliasing into moiré.
 */
export const GRID_FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform vec2 uResolution;
uniform float uGridSize;
uniform float uOpacity;
uniform float uDisplacement;
uniform vec3 uColor;

void main() {
  vec2 velocity = texture(uVelocity, vUv).xy;

  // The refraction itself.
  vec2 uv = vUv + velocity * uDisplacement;

  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 g = uv * aspect * uGridSize;

  vec2 d = abs(fract(g) - 0.5);
  vec2 w = fwidth(g);
  vec2 lines = smoothstep(w * 1.5, w * 0.5, d);
  float line = max(lines.x, lines.y);

  // Fade the grid where the fluid is fastest — it reads as the glass thickening
  // and swallowing the line, and hides the stretching artefacts of large
  // displacement.
  float speed = length(velocity);
  float fade = 1.0 - clamp(speed * 1.5, 0.0, 0.7);

  float a = line * uOpacity * fade;
  if (a < 0.001) discard;
  fragColor = vec4(uColor * a, a);
}`;
