'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

/**
 * Magnetic hover for every element marked `data-magnetic`.
 *
 * Architecture mirrors RevealProvider: one provider, one listener, N targets.
 * A per-button wrapper component would mean a pointermove listener and a React
 * client boundary per CTA; this keeps the buttons server-rendered and costs a
 * single listener for the whole page.
 *
 * This module statically imports gsap, so it is dynamically imported by the
 * layout — that is what keeps GSAP's ~28KB gzipped out of the initial bundle
 * while still letting useGSAP do its job here.
 *
 * Desktop only, by design. `pointer: coarse` devices have no hover state to
 * respond to, so attaching this to a phone would be pure battery cost for an
 * effect nobody can trigger.
 */

/** How far outside the element the field extends, in px. */
const RADIUS = 30;
/** Fraction of the cursor offset the element travels. Past ~0.4 it stops
 *  feeling magnetic and starts feeling broken. */
const STRENGTH = 0.32;

type Target = {
  el: HTMLElement;
  xTo: (v: number) => void;
  yTo: (v: number) => void;
  rect: DOMRect;
  active: boolean;
};

export default function MagneticProvider() {
  const pathname = usePathname();
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (typeof window === 'undefined') return;
      // No hover, no magnetism. Also skips reduced-motion outright.
      if (!window.matchMedia('(pointer: fine)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
      if (!els.length) return;

      const targets: Target[] = els.map((el) => ({
        el,
        // quickTo compiles a reusable tween: no per-move object allocation, and
        // it interrupts cleanly instead of stacking tweens on every pointermove.
        xTo: gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' }),
        yTo: gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' }),
        rect: el.getBoundingClientRect(),
        active: false,
      }));

      /*
       * Rects are measured once and cached, never inside the pointermove
       * handler. getBoundingClientRect() forces a synchronous layout, and doing
       * that per target per mouse move is textbook layout thrashing — it would
       * make the "smooth" effect the jankiest thing on the page.
       *
       * They are re-measured on scroll and resize instead, both throttled to a
       * frame.
       */
      const measure = () => {
        for (const t of targets) t.rect = t.el.getBoundingClientRect();
      };

      let measureRaf = 0;
      const scheduleMeasure = () => {
        if (measureRaf) return;
        measureRaf = requestAnimationFrame(() => {
          measureRaf = 0;
          measure();
        });
      };

      const onMove = (e: PointerEvent) => {
        for (const t of targets) {
          const { rect } = t;
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;

          const inside =
            Math.abs(dx) < rect.width / 2 + RADIUS && Math.abs(dy) < rect.height / 2 + RADIUS;

          if (inside) {
            t.active = true;
            t.xTo(dx * STRENGTH);
            t.yTo(dy * STRENGTH);
          } else if (t.active) {
            // Only issue the return tween once, on the frame it leaves the
            // field — otherwise every element on the page gets two tween calls
            // on every single mouse move.
            t.active = false;
            t.xTo(0);
            t.yTo(0);
          }
        }
      };

      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('scroll', scheduleMeasure, { passive: true });
      window.addEventListener('resize', scheduleMeasure);

      return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', scheduleMeasure);
        window.removeEventListener('resize', scheduleMeasure);
        cancelAnimationFrame(measureRaf);
        // Reset, or an element mid-flight is stranded off-centre when the route
        // changes under it.
        for (const t of targets) gsap.set(t.el, { x: 0, y: 0 });
      };
    },
    // Re-scan after navigation: the previous page's targets are gone.
    { scope, dependencies: [pathname], revertOnUpdate: true },
  );

  return <div ref={scope} aria-hidden="true" style={{ display: 'contents' }} />;
}
