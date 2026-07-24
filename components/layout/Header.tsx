'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { nav } from '@/lib/nav';
import { Emblem } from '@/components/primitives/Emblem';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Wordmark } from './Wordmark';

/**
 * The only interactive chrome on the site. Client-side purely for the mobile
 * disclosure — the animation is CSS on transform/opacity, so no animation
 * library is pulled into the critical path.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Lock scroll behind the mobile panel.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        {/*
          No aria-label here. One would override the accessible name with
          "Fuchesi — home" while the visible text reads "FUCHESİ", and the İ
          (U+0130) is not an i — so the accessible name would not contain the
          visible label, failing WCAG 2.5.3 (Label in Name) and breaking
          voice-control users saying "click Fuchesi". The Wordmark's own sr-only
          text supplies the name instead.
        */}
        <Link href="/" className="-ml-1">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="group relative flex items-center gap-2 text-body-s text-muted transition-colors duration-300 hover:text-ink aria-[current=page]:text-ink"
            >
              {isActive(item.href) && <Emblem size={5} className="text-[var(--accent)]" />}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />

          {/* bg-ink/text-paper is correct in both themes: the tokens swap, so
              this is a dark button on a light page and a light button on a dark
              one, without a single dark: variant. */}
          <Link
            href="/contact"
            className="hidden rounded-full bg-ink px-5 py-2.5 text-body-s font-medium text-paper transition-transform duration-300 ease-[var(--ease-out-expo)] motion-safe:hover:-translate-y-0.5 sm:inline-flex"
          >
            Start a project
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="-mr-2 grid h-11 w-11 place-items-center md:hidden"
          >
            <span className="relative block h-3 w-5">
              <span
                className={`absolute left-0 block h-px w-5 bg-ink transition-transform duration-300 ease-[var(--ease-out-expo)] ${
                  open ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 block h-px w-5 bg-ink transition-transform duration-300 ease-[var(--ease-out-expo)] ${
                  open ? 'top-1.5 -rotate-45' : 'top-3'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile panel. Uses visibility + transform so it neither shifts layout
          nor stays focusable while hidden. */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-hairline bg-paper md:hidden"
      >
        <nav aria-label="Main" className="flex flex-col px-5 py-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="flex items-center gap-3 border-b border-hairline py-4 font-display text-display-s last:border-0"
            >
              {isActive(item.href) && <Emblem size={7} className="text-[var(--accent)]" />}
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="mt-4 inline-flex justify-center rounded-full bg-ink px-5 py-3.5 text-body-s font-medium text-paper"
          >
            Start a project
          </Link>
        </nav>
      </div>
    </header>
  );
}
