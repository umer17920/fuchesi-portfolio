'use client';

import { useEffect, useRef } from 'react';
import { LiquidObsidianEngine, type Palette } from './engine/engine';
import { detectTier } from './engine/quality';

/**
 * The mount point. This module is the dynamic-import target — everything heavy
 * (the engine, the shaders, simplex noise) is reachable only from here, so it
 * lands in a separate chunk that the initial page never requests.
 *
 * The gating decision lives in LiquidObsidian.tsx; by the time this renders we
 * already know the device can and should run it.
 */

/**
 * particleOpacity is deliberately low.
 *
 * 30k beads over a hero-sized area is close to full pixel coverage, so at 0.5
 * the field read as white static and actively competed with the body copy in
 * front of it. Legibility is not negotiable against decoration — the text is
 * why anyone is here. Combined with the quadratic depth tint, this keeps the
 * field reading as a deep volume you can see *into* rather than a curtain.
 */
const DARK: Palette = {
  bgTop: [0.031, 0.031, 0.031], // #080808
  bgBottom: [0.051, 0.051, 0.051], // #0d0d0d
  particleNear: [0.92, 0.94, 1.0],
  particleFar: [0.2, 0.22, 0.3],
  grid: [0.6, 0.65, 0.8],
  gridOpacity: 0.05,
  particleOpacity: 0.26,
};

/**
 * Light theme.
 *
 * Obsidian is dark by definition, so the hero goes dark in both themes — see
 * Hero.tsx. This palette is a touch cooler and brighter to sit against the
 * lighter page furniture around it, but the ground stays obsidian. Inverting to
 * dark-particles-on-white was tried and reads as dust on paper, not liquid.
 */
const LIGHT: Palette = {
  bgTop: [0.043, 0.043, 0.047],
  bgBottom: [0.063, 0.063, 0.07],
  particleNear: [1.0, 1.0, 1.0],
  particleFar: [0.24, 0.26, 0.34],
  grid: [0.7, 0.75, 0.9],
  gridOpacity: 0.06,
  particleOpacity: 0.3,
};

export default function LiquidObsidianCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LiquidObsidianEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: LiquidObsidianEngine;
    try {
      engine = new LiquidObsidianEngine({
        canvas,
        tier: detectTier(),
        palette: document.documentElement.classList.contains('dark') ? DARK : LIGHT,
      });
    } catch (err) {
      // A driver that fails to compile is not worth retrying or reporting to
      // the user — the CSS gradient underneath is a complete fallback.
      console.warn('[LiquidObsidian] disabled:', err);
      return;
    }

    let cancelled = false;

    /*
     * Real context loss: a GPU reset, a driver update, or the OS reclaiming
     * memory under pressure. preventDefault() is required — without it the
     * browser will not fire webglcontextrestored. We stop rather than attempt
     * to rebuild: the CSS gradient underneath is intact, so a lost context
     * degrades to a still background rather than a broken one.
     */
    const onContextLost = (e: Event) => {
      e.preventDefault();
      engine.stop();
      console.warn('[LiquidObsidian] WebGL context lost — falling back to the static gradient.');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    engineRef.current = engine;

    // Dev-only reactivity probe for scripts/check-reactivity.mjs, which asserts
    // against the real velocity field rather than screenshotted pixels — the
    // only reliable signal on a software renderer.
    //
    // The NODE_ENV guard strips this assignment from the production bundle
    // (verified: __obsidianProbe is absent from the built chunks), so the probe
    // is never reachable in production. The engine's debugReadState method it
    // calls does remain in the bundle as unreferenced code — minifiers do not
    // tree-shake unused class methods — but with no caller it is inert.
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __obsidianProbe?: () => unknown }).__obsidianProbe = () =>
        engine.debugReadState();
    }

    // --- visibility: freeze whenever it cannot be seen ---------------------
    // Three independent conditions, all of which must hold to render. This is
    // the difference between a background effect and a battery leak.
    let onScreen = false;
    let tabVisible = !document.hidden;
    let ready = false;

    const sync = () => {
      if (ready && onScreen && tabVisible) engine.start();
      else engine.stop();
    };

    // Shader compilation is deferred to the driver's threads and finalised a
    // program per turn, so this resolves over several frames rather than in one
    // blocking task. Nothing renders until it does.
    engine
      .init()
      .then(() => {
        if (cancelled) return;
        ready = true;
        engine.resize();
        sync();
      })
      .catch((err) => {
        console.warn('[LiquidObsidian] init failed:', err);
      });

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // --- pointer -----------------------------------------------------------
    // Bound to the window, not the canvas: the canvas is pointer-events:none so
    // the site stays fully interactive, which means it never receives events of
    // its own.
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      // GL's origin is bottom-left; the DOM's is top-left.
      const y = 1 - (e.clientY - rect.top) / rect.height;
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) return;
      engine.onPointer(x, y);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // --- resize ------------------------------------------------------------
    // ResizeObserver over window.resize: it also fires when the canvas changes
    // size for reasons other than the viewport, and it coalesces.
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (!ready) return; // buffers do not exist until init resolves
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => engine.resize());
    });
    ro.observe(canvas);

    // --- theme -------------------------------------------------------------
    const themeObserver = new MutationObserver(() => {
      engine.setPalette(document.documentElement.classList.contains('dark') ? DARK : LIGHT);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      cancelled = true;
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      cancelAnimationFrame(resizeRaf);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="h-full w-full"
      // Not just decoration for screen readers — pointer-events:none is what
      // keeps every link, button, and form field above it fully interactive.
      style={{ display: 'block', pointerEvents: 'none' }}
    />
  );
}
