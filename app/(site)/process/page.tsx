import type { Metadata } from 'next';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { process } from '@/lib/process';
import { breadcrumbSchema } from '@/lib/schema';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Process',
  description:
    'How Fuchesi runs projects: discovery, shape, build, launch, support. Five stages from first conversation to long-term support.',
  alternates: { canonical: `${site.url}/process` },
};

export default function ProcessPage() {
  return (
    <>
      <section className="border-b border-hairline pb-20 pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Process</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-display-l">
            Five stages. <em className="italic">No surprises.</em>
          </h1>
          <p className="mt-8 max-w-[62ch] text-body-l text-ink-soft">
            Every {site.name} project runs the same five stages, from the first conversation to the
            software still being looked after two years later. Each stage has a stated output, so
            you always know what you are getting and when.
          </p>
        </Container>
      </section>

      <Section tone="paper">
        <Container>
          <ol className="space-y-20">
            {process.map((stage, i) => (
              <li key={stage.number}>
                <Reveal delay={i * 50}>
                  <article className="grid gap-6 border-b border-hairline pb-16 md:grid-cols-[1fr_1.4fr] md:gap-12 [&:last-child]:border-0">
                    <div>
                      <span className="text-body-s tabular-nums text-muted">{stage.number}</span>
                      <h2 className="mt-3 font-display text-display-m">{stage.name}</h2>
                      <p className="mt-3 max-w-xs text-body-m text-ink-soft">{stage.summary}</p>
                    </div>

                    <div>
                      <p className="max-w-[62ch] text-body-m text-muted">{stage.body}</p>
                      <div className="mt-8 border-t border-hairline pt-5">
                        <span className="text-eyebrow uppercase text-muted">What you get</span>
                        <p className="mt-2 text-body-m">{stage.output}</p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <ContactCta />

      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Process', path: '/process' },
        ])}
      />
    </>
  );
}
