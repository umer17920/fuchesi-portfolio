import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { LanguageWaveform } from '@/components/services/LanguageWaveform';
import { ServiceAnswer } from '@/components/services/ServiceAnswer';
import { FaqSection } from '@/components/shared/FaqSection';
import { formatPrice, getPricing } from '@/lib/pricing';
import { breadcrumbSchema, serviceSchema } from '@/lib/schema';
import { getService, services } from '@/lib/services';
import { site } from '@/lib/site';

type Params = { params: Promise<{ slug: string }> };

// Fully static: every service page is known at build time.
export const dynamicParams = false;
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};

  const url = `${site.url}/services/${service.slug}`;
  return {
    title: service.name,
    description: service.summary,
    alternates: { canonical: url },
    openGraph: {
      title: `${service.name} | ${site.name}`,
      description: service.summary,
      url,
      type: 'website',
    },
  };
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();
  const band = getPricing(service.slug);

  return (
    <>
      <ServiceAnswer eyebrow="Service" title={service.name} answer={service.answer} />

      {/* The multilingual capability is the design moment for calling agents,
          and it belongs high on the page — it is the single most asked-about
          thing about the service. */}
      {service.slug === 'ai-calling-agents' && <LanguageWaveform />}

      {/*
        Price and timeline, stated plainly and high on the page.

        Most agencies bury this behind a form. Publishing it qualifies buyers
        before they write to you, and it is the fact assistants quote when asked
        what something costs. Framed as a floor, which is what it is: the real
        number comes out of discovery.
      */}
      {band && (
        <Section tone="raised">
          <Container>
            <Reveal>
              <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-eyebrow uppercase text-muted">Starts at</dt>
                  <dd className="mt-3 font-display text-display-s">{formatPrice(band.from)}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-muted">First delivery</dt>
                  <dd className="mt-3 text-body-m text-ink">{band.timeline}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-muted">
                    {band.running ? 'Running cost' : 'Typical range'}
                  </dt>
                  <dd className="mt-3 text-body-m text-ink">{band.running ?? band.typical}</dd>
                </div>
                <div>
                  <dt className="text-eyebrow uppercase text-muted">Discovery</dt>
                  <dd className="mt-3 text-body-m text-ink">
                    Free. You get a written scope and a fixed price range before committing.
                  </dd>
                </div>
              </dl>
            </Reveal>
          </Container>
        </Section>
      )}

      <Section tone="paper">
        <Container>
          <div className="space-y-16">
            {service.sections.map((section, i) => (
              <Reveal key={section.heading} delay={i * 60}>
                <article className="grid gap-4 md:grid-cols-[1fr_1.3fr] md:gap-12">
                  {/* Headings are real questions, not labels — they match how
                      people phrase the query to an assistant. */}
                  <h2 className="font-display text-display-s text-balance">{section.heading}</h2>
                  <p className="max-w-[62ch] text-body-m text-muted">{section.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <FaqSection faqs={service.faqs} heading={`${service.shortName}: common questions`} />

      <ContactCta />

      <JsonLd data={serviceSchema(service)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
          { name: service.name, path: `/services/${service.slug}` },
        ])}
      />
    </>
  );
}
