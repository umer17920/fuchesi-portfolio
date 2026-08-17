import { LiquidObsidian } from '@/components/webgl/LiquidObsidian';
import { ButtonLink } from '@/components/primitives/Button';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';

/**
 * Hero — the window onto the Liquid Obsidian field.
 *
 * The section is the only place on the site with an obsidian ground, and it is
 * obsidian in BOTH themes: the effect is dark by definition, so the hero is a
 * deliberate dark band above an otherwise light page in light mode, and simply
 * continuous with the page in dark mode (where --color-paper is #0c0c0e, all
 * but identical to the obsidian gradient).
 *
 * Everything here therefore uses the fixed `on-obsidian` tokens rather than the
 * theme tokens. `text-ink` or `primary` buttons would render near-black on
 * near-black in light mode. --accent is rebound locally for the same reason, so
 * <Eyebrow> stays legible without knowing where it is.
 *
 * The LCP element is still this H1 — text, painted from server HTML, with no
 * dependency on the canvas. The WebGL chunk is not requested until the page is
 * idle, so none of this is on the critical path.
 */
export function Hero() {
  return (
    <section
      className="relative isolate overflow-hidden [--accent:var(--color-on-obsidian)]"
      style={{
        color: 'var(--color-on-obsidian)',
        /*
         * The obsidian ground belongs to the SECTION, not to <LiquidObsidian>.
         *
         * It previously lived on the effect's own container — an absolutely
         * positioned child — which meant the hero's background depended on a
         * child component rendering. If that component ever failed to mount,
         * light mode would render #f2f2f3 text on the body's #FAFAFA: invisible.
         * Owning the ground here makes the hero correct on its own, and the
         * canvas is then purely additive.
         *
         * backgroundColor is declared separately from the gradient, not folded
         * into the `background` shorthand. A gradient is a background *image*,
         * so with the shorthand alone the computed backgroundColor is
         * transparent — meaning any tool that resolves an element's backdrop
         * (ours, axe, a contrast checker) sees straight through the hero to the
         * body and reports white-on-white. The solid colour is both the honest
         * answer to that question and a real fallback if the gradient fails.
         */
        backgroundColor: 'var(--color-obsidian)',
        backgroundImage:
          'linear-gradient(180deg, var(--color-obsidian) 0%, var(--color-obsidian-end) 100%)',
      }}
    >
      {/* Scoped to this section, not the viewport: the effect belongs to the
          hero, and IntersectionObserver can then freeze it the moment the hero
          scrolls away. */}
      <LiquidObsidian />

      {/*
        Scrim. Not decoration — legibility insurance.

        The particle field is dense and, worse, non-deterministic: a bright bead
        can drift behind any glyph at any moment, so no static contrast check
        can prove the copy is readable. This guarantees a floor. It is weighted
        to the left, where the text sits, and fades out to the right so the
        field stays fully visible in the open half of the hero.

        -z-10 puts it above the canvas (also -z-10, but later in paint order)
        and still behind the content at z-10.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          /*
           * Kept deliberately light. The first version ran 0.92 → 0 across the
           * full width, which erased the particle field across the left
           * two-thirds — precisely where the text sits and where the cursor
           * spends its time — so the effect read as "gone" even though it was
           * rendering correctly.
           *
           * It does not need to be heavy: the copy is #F2F2F3 on #080808
           * obsidian, already 17.37:1. The scrim only has to blunt the worst
           * case of a bright bead drifting directly behind a glyph, so it peaks
           * at 0.55 and clears by 60% — enough insurance, and the field stays
           * visible everywhere.
           */
          background:
            'linear-gradient(90deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.34) 32%, rgba(8,8,8,0.10) 48%, rgba(8,8,8,0) 60%)',
        }}
      />

      {/*
        `data-enter` marks above-the-fold content for the route-enter stagger
        (see AnimationProvider). It is deliberately NOT applied below the fold —
        that content is owned by the IntersectionObserver reveal system, and
        marking it here would animate it twice.

        `data-magnetic` opts the CTAs into the magnetic hover field. Both are
        plain attributes on server-rendered markup: no client boundary, no
        wrapper component, and if the JS never loads they are inert.
      */}
      <Container className="relative z-10 pb-28 pt-24 sm:pt-32">
        <Eyebrow data-enter>Software development &amp; AI automation</Eyebrow>

        <h1 data-enter className="mt-8 max-w-5xl font-display text-display-xl">
          Software that earns
          <br />
          its <em className="italic">place.</em>
        </h1>

        <div className="mt-10 grid gap-10 md:grid-cols-[1.1fr_auto] md:items-end">
          <p
            data-enter
            className="max-w-xl text-body-l"
            style={{ color: 'var(--color-on-obsidian-muted)' }}
          >
            Fuchesi builds custom software, ERP systems, AI calling agents, lead generation
            pipelines, and workflow automations for businesses that have outgrown the tools they
            started with.
          </p>

          <div data-enter className="flex flex-wrap gap-3">
            <ButtonLink href="/contact" variant="inverse" data-magnetic>
              Start a project
            </ButtonLink>
            <ButtonLink href="/work" variant="inverse-outline" data-magnetic>
              See our work
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
