/**
 * Device tiering and the adaptive quality governor.
 *
 * The brief is "all devices, fastest load, minimum battery and thermal cost,
 * maximum responsiveness". On a 30k-particle GPGPU fluid sim those goals fight
 * each other, so this module is where they get reconciled — it matters more to
 * the outcome than any shader does.
 *
 * Three mechanisms:
 *
 * 1. STATIC TIERING — a cheap capability guess before the first frame, so a
 *    weak device never even attempts a load it cannot sustain.
 * 2. DYNAMIC GOVERNOR — measured frame cost downgrades the tier at runtime.
 *    Static guessing is unreliable (deviceMemory is coarse, and a thermally
 *    throttled flagship reports as a flagship), so the honest signal is the
 *    frame time we actually observe.
 * 3. IDLE THROTTLE — the fluid is specified to melt to a standstill in ~2s.
 *    Once it has, nothing is moving except particle micro-vibration, and
 *    rendering that at 60fps is pure battery burn. We drop to a low cadence
 *    until the pointer moves again.
 */

export type Tier = 'high' | 'medium' | 'low';

export type QualitySettings = {
  tier: Tier;
  /** Velocity-field resolution (square). The sim is invisible; it only needs to be smooth. */
  simResolution: number;
  /** Particle count. Rounded to a square texture below. */
  particleCount: number;
  /** Jacobi iterations for the pressure solve. Fewer = softer, cheaper fluid. */
  pressureIterations: number;
  /** Device pixel ratio cap. The single biggest lever on fill-rate-bound GPUs. */
  dprCap: number;
  /** Target fps while the pointer is active. */
  activeFps: number;
  /** Target fps once the fluid has settled. */
  idleFps: number;
  /** Vorticity confinement strength — the "curl" that keeps swirls alive. */
  curl: number;
  drawGrid: boolean;
};

const TIERS: Record<Tier, Omit<QualitySettings, 'tier'>> = {
  high: {
    simResolution: 128,
    particleCount: 30000,
    pressureIterations: 20,
    dprCap: 1.5,
    activeFps: 60,
    idleFps: 30,
    curl: 30,
    drawGrid: true,
  },
  medium: {
    simResolution: 96,
    particleCount: 12000,
    pressureIterations: 12,
    dprCap: 1.25,
    activeFps: 60,
    idleFps: 24,
    curl: 24,
    drawGrid: true,
  },
  low: {
    // Phones. Every number here is chosen to keep the GPU cool rather than to
    // look impressive: a hot, stuttering luxury effect reads worse than none.
    simResolution: 64,
    particleCount: 5000,
    pressureIterations: 6,
    dprCap: 1,
    activeFps: 30,
    idleFps: 15,
    curl: 18,
    drawGrid: false,
  },
};

/** Cheap static guess, before anything is allocated. */
export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'low';

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 1024;

  // A coarse pointer is the most reliable "this is a phone or tablet" signal
  // available — far more so than width, which lies on a narrow desktop window.
  if (coarse || narrow) {
    return memory >= 8 && cores >= 8 ? 'medium' : 'low';
  }
  if (memory <= 4 || cores <= 4) return 'medium';
  return 'high';
}

export function settingsFor(tier: Tier): QualitySettings {
  return { tier, ...TIERS[tier] };
}

const ORDER: Tier[] = ['low', 'medium', 'high'];

/**
 * Watches real frame cost and downgrades when the device cannot keep up.
 *
 * Deliberately one-way. Upgrading on a good run causes oscillation — the tier
 * rises, the frame cost rises with it, it drops again, and the user watches the
 * quality pump. Downgrades are permanent for the session.
 */
export class QualityGovernor {
  private frames = 0;
  private accum = 0;
  private strikes = 0;
  private current: Tier;

  constructor(
    tier: Tier,
    private readonly onDowngrade: (tier: Tier) => void,
  ) {
    this.current = tier;
  }

  /** Feed each frame's delta in ms. */
  sample(dt: number) {
    // Ignore absurd deltas: a backgrounded tab or a GC pause is not a signal
    // about the GPU, and treating it as one downgrades people unfairly.
    if (dt > 250) return;

    this.accum += dt;
    this.frames++;
    if (this.frames < 60) return;

    const avg = this.accum / this.frames;
    this.frames = 0;
    this.accum = 0;

    // ~22ms ≈ under 45fps. One bad second is noise; three in a row is a device
    // telling us the truth.
    if (avg > 22) {
      this.strikes++;
      if (this.strikes >= 3) this.downgrade();
    } else {
      this.strikes = 0;
    }
  }

  private downgrade() {
    const i = ORDER.indexOf(this.current);
    if (i <= 0) return; // already at the floor
    this.current = ORDER[i - 1];
    this.strikes = 0;
    this.onDowngrade(this.current);
  }
}
