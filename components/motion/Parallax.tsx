'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type ParallaxProps = {
  children: ReactNode;
  /** Fraction of scroll distance to offset by. Keep low — past ~0.2 it reads as broken. */
  speed?: number;
  className?: string;
};

/**
 * Subtle scroll parallax. Writes only translate3d, so it stays on the
 * compositor and can never shift layout.
 *
 * The element's document offset is measured once and cached, so the scroll
 * handler reads window.scrollY only — no per-frame getBoundingClientRect, and
 * therefore no layout thrash. Work is coalesced into one rAF per frame.
 */
export function Parallax({ children, speed = 0.12, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No parallax at all under reduced motion — not a slower one.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let anchor = 0;
    let raf = 0;

    const measure = () => {
      // Read once, outside the scroll path.
      const prev = el.style.transform;
      el.style.transform = '';
      anchor = el.getBoundingClientRect().top + window.scrollY;
      el.style.transform = prev;
    };

    const update = () => {
      raf = 0;
      const offset = (window.scrollY - anchor) * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
