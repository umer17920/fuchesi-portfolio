import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact/ContactForm';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/schema';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Tell ${site.name} what is not working. We will tell you what we would build, what it would cost, and whether you need us at all.`,
  alternates: { canonical: `${site.url}/contact` },
};

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-hairline pb-16 pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Contact</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-display-l">
            Tell us what is <em className="italic">not working.</em>
          </h1>
          <p className="mt-8 max-w-[62ch] text-body-l text-ink-soft">
            Describe the problem in your own words. We will tell you what we would build, what it
            would cost, and whether you need us at all.
          </p>
        </Container>
      </section>

      <Section tone="paper">
        <Container>
          <div className="grid gap-16 lg:grid-cols-[1.4fr_1fr] lg:gap-24">
            <ContactForm />

            <aside className="space-y-10">
              <div>
                <h2 className="text-eyebrow uppercase text-muted">Email</h2>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="mt-2 block text-body-m underline decoration-hairline underline-offset-4 transition-colors duration-300 hover:decoration-ink"
                >
                  {site.contact.email}
                </a>
              </div>

              <div>
                <h2 className="text-eyebrow uppercase text-muted">Phone</h2>
                <a
                  href={`tel:${site.contact.phone}`}
                  className="mt-2 block text-body-m underline decoration-hairline underline-offset-4 transition-colors duration-300 hover:decoration-ink"
                >
                  {site.contact.phoneDisplay}
                </a>
              </div>

              {site.contact.whatsapp && (
                <div>
                  <h2 className="text-eyebrow uppercase text-muted">WhatsApp</h2>
                  <a
                    href={`https://wa.me/${site.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-body-m underline decoration-hairline underline-offset-4 transition-colors duration-300 hover:decoration-ink"
                  >
                    {site.contact.whatsapp}
                  </a>
                </div>
              )}

              {site.sameAs.length > 0 && (
                <div>
                  <h2 className="text-eyebrow uppercase text-muted">Elsewhere</h2>
                  {site.sameAs.map((href) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-body-m underline decoration-hairline underline-offset-4 transition-colors duration-300 hover:decoration-ink"
                    >
                      {href.includes('instagram') ? 'Instagram' : new URL(href).hostname}
                    </a>
                  ))}
                </div>
              )}

              <div className="border-t border-hairline pt-8">
                <h2 className="text-eyebrow uppercase text-muted">What happens next</h2>
                <ol className="mt-4 space-y-3 text-body-s text-muted">
                  <li>We read it and reply within one working day.</li>
                  <li>A short call to understand the problem properly.</li>
                  <li>A written scope, a fixed price range, and an honest recommendation.</li>
                </ol>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
    </>
  );
}
