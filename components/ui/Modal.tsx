'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Premium modal — scales out of the exact point that opened it.
 *
 * This module statically imports gsap and is therefore dynamically imported by
 * its callers (see ModalDemo usage), keeping GSAP out of the initial bundle.
 *
 * The origin trick is what sells it: transform-origin is set to the click
 * coordinate, so the panel grows from the button the user actually pressed
 * rather than from an abstract centre. That single detail is the difference
 * between "a dialog appeared" and "the thing I pressed became this".
 *
 * Accessibility is not optional here and is genuinely easy to get wrong:
 *  · role="dialog" + aria-modal, labelled by its own heading
 *  · focus moves in on open and RESTORES to the trigger on close
 *  · focus is trapped while open
 *  · Escape closes
 *  · background scroll is locked
 * A beautiful modal that strands a keyboard user is a broken modal.
 */

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Viewport coords of the click that opened it. Falls back to the centre. */
  origin?: { x: number; y: number } | null;
};

export default function Modal({ open, onClose, title, children, origin }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus so it can be handed back on close.
  useEffect(() => {
    if (open) triggerRef.current = document.activeElement as HTMLElement;
  }, [open]);

  useGSAP(
    () => {
      if (!open) return;
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      const content = contentRef.current;
      if (!overlay || !panel || !content) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced) {
        // Appear, do not animate. A modal springing out of a point is exactly
        // the motion this preference exists to suppress.
        gsap.set([overlay, panel, content], { opacity: 1, scale: 1, clearProps: 'transform' });
        return;
      }

      // Grow from the press. Origin is expressed relative to the panel's own
      // box, which is what transform-origin needs.
      const rect = panel.getBoundingClientRect();
      const ox = origin ? ((origin.x - rect.left) / rect.width) * 100 : 50;
      const oy = origin ? ((origin.y - rect.top) / rect.height) * 100 : 50;
      gsap.set(panel, { transformOrigin: `${ox}% ${oy}%` });

      const tl = gsap.timeline();

      tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });

      tl.fromTo(
        panel,
        { scale: 0.82, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.55,
          // expo.out, not elastic. Elastic overshoots and wobbles — it reads as
          // playful, which is wrong for a company selling ERP systems. expo.out
          // arrives fast and settles hard: expensive, not bouncy.
          ease: 'expo.out',
        },
        '-=0.15',
      );

      // Content lags the panel slightly. The panel arrives, *then* it fills —
      // which is what makes it feel like a physical object rather than an image
      // being scaled up.
      tl.fromTo(
        content,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' },
        '-=0.32',
      );
    },
    { dependencies: [open, origin], scope: overlayRef },
  );

  // Escape, focus trap, scroll lock.
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = triggerRef.current;

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    // Move focus in, so a keyboard user is actually inside the dialog.
    const first = focusables()[0] ?? panel;
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // Trap: cycle within the dialog rather than escaping to the page behind.
      const list = focusables();
      if (!list.length) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // Hand focus back to whatever opened this. Without it, a keyboard user
      // is dumped at the top of the document.
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      onMouseDown={(e) => {
        // mousedown, not click: a click that STARTS inside the panel and ends
        // on the overlay (a text drag-select) would otherwise close it.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className="relative w-full max-w-lg rounded-xl border border-hairline bg-paper p-8 shadow-2xl outline-none"
      >
        <div ref={contentRef}>
          <h2 id="modal-title" className="font-display text-display-s">
            {title}
          </h2>
          <div className="mt-4 text-body-m text-muted">{children}</div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:text-ink"
            aria-label="Close dialog"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
