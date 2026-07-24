import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';

type ServiceAnswerProps = {
  eyebrow: string;
  title: string;
  answer: string;
};

/**
 * The answer block that opens every service page.
 *
 * Deliberately placed above any marketing narrative: it states plainly what the
 * service is, in 2–3 declarative sentences, so both a skim-reading buyer and an
 * AI assistant get the definition before anything is being sold to them. The
 * same string is emitted as Service.description in JSON-LD, so what gets quoted
 * and what gets read are guaranteed identical.
 *
 * Set at a large measure but capped near 68ch — long-measure body text is the
 * fastest way to make a page feel unreadable.
 */
export function ServiceAnswer({ eyebrow, title, answer }: ServiceAnswerProps) {
  return (
    <section className="border-b border-hairline pb-20 pt-16 sm:pt-20">
      <Container>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-7 max-w-4xl font-display text-display-l">{title}</h1>
        <p className="mt-8 max-w-[62ch] text-body-l text-ink-soft">{answer}</p>
      </Container>
    </section>
  );
}
