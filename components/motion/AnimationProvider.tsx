'use client';

import { TransitionRouter } from 'next-transition-router';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Page-to-page choreography: a seamless cross-fade and slide on the page
 * wrapper itself.
 *
 * ── What this replaced, and why ───────────────────────────────────────────
 * The previous version swept a full-screen obsidian SVG curtain across the
 * viewport. It was measurably clunky: click → route swap took 507ms against
 * 74ms with the animation off, so every navigation paid ~433ms of pure
 * choreography — on a site whose pages are all static and prefetched, i.e.
 * already instant. It also hid the header behind a panel, breaking the sense
 * that the chrome is continuous and only the content changes.
 *
 * This version animates only the content wrapper. The header, footer, and the
 * obsidian hero never move or get covered — the structure holds still and the
 * page changes inside it, which is what "continuous" actually means.
 *
 * ── Timing ────────────────────────────────────────────────────────────────
 * leave 0.4s expo.out, enter 0.5s expo.out. The leave still gates the route
 * swap (next() IS the navigation), so it is kept short and crisp on purpose.
 *
 * ── Why GSAP is imported lazily ───────────────────────────────────────────
 * GSAP core is ~71KB minified (~28KB gzipped). Mobile Lighthouse is already
 * under budget, so it must not sit in the initial bundle. `leave` may be
 * async, so we import on first use and preload on idle — warm before anyone
 * clicks, and never on the critical path.
 */

const LEAVE_S = 0.4;
const ENTER_S = 0.5;
const SHIFT_PX = 20;

type GsapModule = (typeof import('gsap'))['gsap'];

/**
 * The element the transitions actually move.
 *
 * Placed inside <main> by the layout so it wraps ONLY page content — the
 * header, footer, and skip link stay outside it and never fade, slide, or get
 * covered. TransitionRouter has to wrap the whole tree because it is a context
 * provider, so the two responsibilities are deliberately separate components.
 */
export function PageWrapper({ children }: { children: ReactNode }) {
  return <div data-page-wrapper="">{children}</div>;
}

const getWrapper = () => document.querySelector<HTMLElement>('[data-page-wrapper]');

export function AnimationProvider({ children }: { children: ReactNode }) {
  const gsapRef = useRef<GsapModule | null>(null);

  /*
   * Preload GSAP once the page is idle.
   *
   * Without this, the import happens on the first click — a network round trip
   * inside the leave handler, so the very first transition stutters or fires
   * late. Warming it on idle keeps it off the critical path AND makes the first
   * navigation as smooth as the tenth.
   */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const mod = await import('gsap');
      if (!cancelled) gsapRef.current = mod.gsap;
    };
    if (typeof window.requestIdleCallback === 'function') {
      const h = window.requestIdleCallback(() => void load(), { timeout: 3000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(h);
      };
    }
    const t = window.setTimeout(() => void load(), 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const getGsap = async (): Promise<GsapModule> => {
    if (gsapRef.current) return gsapRef.current;
    const mod = await import('gsap');
    gsapRef.current = mod.gsap;
    return mod.gsap;
  };

  /**
   * Reduced motion navigates instantly. Not a shorter fade — none.
   */
  const prefersReduced = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        if (prefersReduced()) {
          next();
          return;
        }
        void (async () => {
          const gsap = await getGsap();
          const el = getWrapper();
          if (!el) {
            next();
            return;
          }
          gsap.to(el, {
            opacity: 0,
            y: -SHIFT_PX,
            duration: LEAVE_S,
            ease: 'expo.out',
            // next() performs the navigation. Nothing swaps until this fires,
            // which is why LEAVE_S stays tight.
            onComplete: next,
          });
        })();
      }}
      enter={(next) => {
        if (prefersReduced()) {
          // Guarantee a clean slate: if a previous tween was interrupted the
          // wrapper could still be at opacity 0, which would leave the page
          // blank forever.
          const reset = getWrapper();
          if (reset) {
            reset.style.opacity = '1';
            reset.style.transform = 'none';
          }
          next();
          return;
        }
        void (async () => {
          const gsap = await getGsap();
          const el = getWrapper();
          if (!el) {
            next();
            return;
          }

          const tl = gsap.timeline({ onComplete: next });

          // fromTo, not from: the wrapper is currently at opacity 0 / y:-20
          // from the leave, so an implicit `from` would read that as the
          // destination and animate to nothing. The end state is stated
          // explicitly, and clearProps hands styling back to CSS so no inline
          // opacity can strand the page.
          tl.fromTo(
            el,
            { opacity: 0, y: SHIFT_PX },
            {
              opacity: 1,
              y: 0,
              duration: ENTER_S,
              ease: 'expo.out',
              clearProps: 'transform,opacity',
            },
          );

          /*
           * Stagger the incoming headline elements, overlapping the wrapper's
           * own fade so it reads as one gesture rather than two.
           *
           * Scoped to [data-enter]: below-fold content belongs to the
           * IntersectionObserver reveal system, and animating both would
           * double-animate every section.
           */
          const targets = document.querySelectorAll('[data-enter]');
          if (targets.length) {
            tl.from(
              targets,
              {
                y: 30,
                opacity: 0,
                duration: 0.7,
                ease: 'power4.out',
                stagger: 0.06,
                clearProps: 'transform,opacity',
              },
              '-=0.34',
            );
          }
        })();
      }}
    >
      {children}
    </TransitionRouter>
  );
}
