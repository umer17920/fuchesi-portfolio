'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * Lazy mount for the magnetic layer.
 *
 * MagneticProvider statically imports gsap (it has to — useGSAP needs it), so
 * importing it directly from the layout would pull GSAP's ~28KB gzipped into
 * the initial bundle for every page, on a mobile score already under budget.
 * Loading it here, after idle, keeps it off the critical path entirely.
 *
 * It is also skipped outright on devices that cannot use it: no hover means no
 * magnetism, so a phone never downloads the chunk at all.
 */
const MagneticProvider = dynamic(() => import('./MagneticProvider'), { ssr: false });

export function MotionLayer() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // A coarse pointer has no hover state to react to; reduced-motion has asked
    // us not to. Either way, never fetch the chunk.
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    const go = () => !cancelled && setEnabled(true);

    if (typeof window.requestIdleCallback === 'function') {
      const h = window.requestIdleCallback(go, { timeout: 3000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(h);
      };
    }
    const t = window.setTimeout(go, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!enabled) return null;
  return <MagneticProvider />;
}
