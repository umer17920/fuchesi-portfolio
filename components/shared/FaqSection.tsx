import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import type { Faq } from '@/lib/services';

type FaqSectionProps = {
  faqs: Faq[];
  heading?: string;
  eyebrow?: string;
  /** Emit FAQPage JSON-LD. Only one FAQPage block per page — set false on secondary blocks. */
  schema?: boolean;
};

/**
 * FAQ block, marked up with FAQPage JSON-LD.
 *
 * Built on native <details>. That is deliberate: the answer text sits in the
 * server-rendered HTML whether or not the item is open, so an AI crawler that
 * never executes JS still reads every answer. A JS accordion that mounts
 * answers on click would hide exactly the content we want cited. It is also
 * free keyboard accessibility.
 *
 * Answers must be plain text here — schema.org acceptedAnswer takes a string,
 * and it must match what's on the page.
 */
export function FaqSection({
  faqs,
  heading = 'Questions people ask',
  eyebrow = 'FAQ',
  schema = true,
}: FaqSectionProps) {
  // Strip the HTML review comments before they reach schema or the page.
  const clean = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '').trim();

  return (
    <Section tone="raised">
      <Container>
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-6 max-w-3xl font-display text-display-l">{heading}</h2>
        </Reveal>

        <div className="mt-14 border-t border-hairline">
          {faqs.map((faq, i) => (
            <Reveal key={faq.question} delay={i * 40}>
              <details className="group border-b border-hairline">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-body-l font-medium">{faq.question}</h3>
                  <span
                    aria-hidden="true"
                    className="relative mt-2 h-3 w-3 shrink-0 text-muted"
                  >
                    <span className="absolute top-1/2 left-0 h-px w-3 -translate-y-1/2 bg-current" />
                    <span className="absolute top-1/2 left-0 h-px w-3 -translate-y-1/2 rotate-90 bg-current transition-transform duration-300 ease-[var(--ease-out-expo)] group-open:rotate-0" />
                  </span>
                </summary>
                <p className="max-w-[68ch] pb-6 text-body-m text-muted">{clean(faq.answer)}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </Container>

      {schema && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: clean(faq.answer) },
            })),
          }}
        />
      )}
    </Section>
  );
}
