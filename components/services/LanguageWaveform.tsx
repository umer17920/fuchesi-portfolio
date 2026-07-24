import type { CSSProperties } from 'react';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { languages } from '@/lib/languages';

// A fixed, hand-tuned profile rather than random values: the wave must be
// identical on server and client (random would hydrate-mismatch) and identical
// between builds.
const BARS = [
  0.3, 0.55, 0.85, 0.45, 1, 0.7, 0.35, 0.9, 0.5, 0.75, 0.4, 0.95, 0.6, 0.3, 0.8, 0.5, 0.65, 0.35,
  0.9, 0.45, 0.7, 0.3, 0.55, 0.85, 0.4,
];

/**
 * The multilingual moment on the AI calling agents page.
 *
 * Two ideas, both built from the wordmark's emblem: a voice waveform whose bars
 * are elongated versions of the circular mark, and the language list beneath it
 * with a highlight travelling through.
 *
 * Entirely CSS — no JS, no animation library. Every language name is plain text
 * in the server-rendered HTML, so "can Fuchesi's agents speak Urdu?" is
 * answerable by a crawler that never runs a script, and by a screen reader
 * reading a normal list. The animation only tints; it never gates content.
 */
export function LanguageWaveform() {
  return (
    <Section tone="emphasis" size="lg">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-display-l">
            It speaks your
            <br />
            <em className="italic">customer’s language.</em>
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-body-m text-on-emphasis/60">
            Agents hold the call in the language the caller uses — and switch mid-conversation when
            they do.
          </p>
        </div>

        {/* Waveform. Decorative: the claim itself is in the text above and the
            list below, so this is hidden from assistive tech. */}
        <div
          aria-hidden="true"
          className="mx-auto mt-16 flex h-24 max-w-2xl items-center justify-center gap-1.5"
        >
          {BARS.map((rest, i) => (
            <span
              key={i}
              className="wave-bar h-full w-1 rounded-full bg-[var(--accent)]"
              style={{ '--i': i, '--rest': rest } as CSSProperties}
            />
          ))}
        </div>

        <ul className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-2.5">
          {languages.map((lang, i) => (
            <li
              key={lang.name}
              className="lang-chip flex items-center gap-2 rounded-full border px-4 py-2 text-body-s"
              style={{ '--i': i, '--count': languages.length } as CSSProperties}
            >
              <span>{lang.name}</span>
              {lang.native !== lang.name && (
                // lang + dir so screen readers switch voice and RTL endonyms
                // render in the right order.
                <span lang={lang.code} dir={lang.rtl ? 'rtl' : undefined} className="opacity-50">
                  {lang.native}
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-body-s text-on-emphasis/50">
          Need one that is not listed? Ask — the list is what we have built, not the limit.
        </p>
      </Container>
    </Section>
  );
}
