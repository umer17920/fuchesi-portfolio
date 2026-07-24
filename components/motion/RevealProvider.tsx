'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Drives every scroll reveal on the page from a single IntersectionObserver.
 *
 * Mounted once in the layout. <Reveal> stays a server component that only
 * stamps a `data-reveal` attribute, so revealed content costs zero client JS
 * per element and is present in the server-rendered HTML.
 *
 * The animation itself is pure CSS (see globals.css) and touches only opacity
 * and transform, so it never leaves the compositor and never shifts layout.
 */
export function RevealProvider() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'),
    );
    if (els.length === 0) return;

    // Reduced motion is handled in CSS, but there's no point paying for an
    // observer whose result is already forced.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.setAttribute('data-revealed', ''));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-revealed', '');
          io.unobserve(entry.target); // reveal once, then stop paying for it
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]); // re-scan after client-side navigation

  return null;
}
