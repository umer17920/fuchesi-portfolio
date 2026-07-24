import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, serviceSchema } from '@/lib/schema';
import { services } from '@/lib/services';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Services',
  description: site.shortDescription,
  alternates: { canonical: `${site.url}/services` },
};

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-hairline pb-20 pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Services</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-display-l">
            Five things, done properly.
          </h1>
          <p className="mt-8 max-w-[62ch] text-body-l text-ink-soft">
            {site.name} builds custom software, ERP systems, AI calling agents, lead generation
            pipelines, and AI workflow automations. Every engagement starts with discovery, and
            every one can end with us telling you that you do not need it.
          </p>
        </Container>
      </section>

      <Section tone="paper">
        <Container>
          <div className="space-y-20">
            {services.map((service, i) => (
              <Reveal key={service.slug} delay={i * 50}>
                <article className="grid gap-6 border-b border-hairline pb-16 last:border-0 md:grid-cols-[1fr_1.4fr] md:gap-12">
                  <div>
                    <span className="text-body-s tabular-nums text-muted">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="mt-3 font-display text-display-m text-balance">
                      <Link
                        href={`/services/${service.slug}`}
                        className="transition-opacity duration-300 hover:opacity-70"
                      >
                        {service.name}
                      </Link>
                    </h2>
                  </div>

                  <div>
                    {/* The answer paragraph, same text as the service page and
                        its Service schema. */}
                    <p className="max-w-[62ch] text-body-m text-ink-soft">{service.answer}</p>
                    <Link
                      href={`/services/${service.slug}`}
                      className="mt-7 inline-flex items-center gap-2 border-b border-hairline pb-1 text-body-s transition-colors duration-300 hover:border-ink"
                    >
                      More on {service.shortName.toLowerCase()}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <ContactCta />

      {/* One Service node per offering, all pointing at the same Organization. */}
      {services.map((service) => (
        <JsonLd key={service.slug} data={serviceSchema(service)} />
      ))}
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Services', path: '/services' },
        ])}
      />
    </>
  );
}
