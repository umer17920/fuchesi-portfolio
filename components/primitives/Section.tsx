import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  /**
   * `raised` alternates the background; `emphasis` is the stand-out section.
   *
   * `emphasis` is not "the dark one" — in light mode it happens to be near-black,
   * but in dark mode it is an elevated dark panel rather than an inverted white
   * one. Anything rendered inside it must use the `on-emphasis` colour, never
   * `paper`, or it will invert into dark-on-dark when the theme flips.
   */
  tone?: 'paper' | 'raised' | 'emphasis';
  size?: 'default' | 'lg';
  id?: string;
  className?: string;
};

const tones = {
  paper: 'bg-paper text-ink',
  raised: 'bg-paper-raised text-ink',
  // Rebinds --accent so children referencing var(--accent) stay legible here
  // without knowing which surface they are on.
  emphasis: 'bg-emphasis text-on-emphasis [--accent:var(--color-accent-on-emphasis)]',
} as const;

export function Section({
  children,
  tone = 'paper',
  size = 'default',
  id,
  className = '',
}: SectionProps) {
  const pad = size === 'lg' ? 'py-section-lg' : 'py-section';
  return (
    <section id={id} className={`${tones[tone]} ${pad} ${className}`}>
      {children}
    </section>
  );
}
