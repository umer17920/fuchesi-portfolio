'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { supportsWebGL2 } from './engine/gl';

/**
 * Gate + lazy loader for the Liquid Obsidian background.
 *
 * The brief is "all devices, fastest load, minimum battery, maximum
 * responsiveness". This component is where "fastest load" is actually
 * delivered — the engine, shaders, and simplex noise live behind a dynamic
 * import, so the initial HTML/JS never references them and the browser never
 * fetches them until after the page is interactive.
 *
 * Load sequence, deliberately last in line:
 *   1. server renders the CSS gradient only — no canvas, no JS
 *   2. page paints, LCP settles, hydration completes
 *   3. requestIdleCallback fires (or a 2s fallback timer)
 *   4. capability + preference checks
 *   5. only then is the WebGL chunk requested
 *
 * The order matters: importing at module scope would put the chunk in the
 * initial graph and cost LCP even with ssr:false.
 */
const Canvas = dynamic(() => import('./LiquidObsidianCanvas'), {
  ssr: false,
  loading: () => null,
});

type Props = {
  /** Extra classes for the fixed container. */
  className?: string;
};

export function LiquidObsidian({ className = '' }: Props) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Reduced motion: never load. A fluid simulation is the single most
    // motion-heavy thing on the site, and the request is unambiguous.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    // Respect Save-Data. Someone who has asked their browser to conserve
    // bandwidth should not be shipped a WebGL bundle.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (conn?.saveData) return;
    // 2G/slow-2G: the effect would arrive long after they had read the page.
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;

    let cancelled = false;
    let idleHandle: number | undefined;
    let timer: number | undefined;

    const decide = () => {
      if (cancelled) return;
      // supportsWebGL2 creates and destroys a probe context, so it is deferred
      // to idle along with everything else rather than run during hydration.
      if (!supportsWebGL2()) return;
      setShouldRender(true);
    };

    /*
     * requestIdleCallback is missing in Safari; the timeout is a real fallback
     * path, not a duplicate.
     *
     * Feature-detected with typeof rather than `'requestIdleCallback' in
     * window`: lib.dom declares it on Window, so the `in` check narrows the
     * else branch to `never` and TypeScript rejects the fallback. The type says
     * it exists; Safari says otherwise. Trust Safari.
     */
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(decide, { timeout: 2500 });
    } else {
      timer = window.setTimeout(decide, 1200);
    }

    // If the visitor turns reduced-motion on mid-session, tear the whole thing
    // down rather than leaving it running.
    const onPrefChange = (e: MediaQueryListEvent) => {
      if (e.matches) setShouldRender(false);
    };
    reduced.addEventListener('change', onPrefChange);

    return () => {
      cancelled = true;
      if (idleHandle !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timer !== undefined) clearTimeout(timer);
      reduced.removeEventListener('change', onPrefChange);
    };
  }, []);

  return (
    /*
     * Purely additive, and transparent by design.
     *
     * The obsidian gradient is owned by the host section (see Hero.tsx), not
     * here — so if WebGL is unavailable, refused via reduced-motion/Save-Data,
     * or throws at any point, this renders nothing at all and the hero still
     * looks exactly as intended. There is no fallback to maintain because
     * there is nothing to fall back from.
     */
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      {shouldRender && <Canvas />}
    </div>
  );
}
