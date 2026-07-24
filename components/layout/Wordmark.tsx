import { site } from '@/lib/site';

/**
 * TEMPORARY STAND-IN for the real logo.
 *
 * TODO: confirm — fuchesi.png was not present in the repository, so this
 * renders the wordmark typographically in Source Serif as a placeholder. It is
 * deliberately the only place the wordmark is drawn, so replacing it is a
 * one-file change:
 *
 *   1. drop the asset at public/brand/fuchesi.svg (preferred) or .png
 *   2. swap this component's body for next/image pointing at it
 *   3. keep the clear-space rule below — the logo needs generous room and must
 *      never be stretched, recoloured, or given effects
 *
 * Clear space is enforced here via padding rather than left to each caller,
 * so no layout can crowd the mark.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block font-display text-[1.35rem] font-medium tracking-[0.14em] leading-none ${className}`}
      // Clear space: half the cap height on every side, per brand rule.
      style={{ padding: '0.35em 0.2em' }}
    >
      <span className="sr-only">{site.name}</span>
      <span aria-hidden="true">FUCHESİ</span>
    </span>
  );
}
