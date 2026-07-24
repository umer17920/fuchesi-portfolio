import type { Metadata } from 'next';
import Image from 'next/image';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Emblem } from '@/components/primitives/Emblem';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { projects } from '@/lib/projects';
import { breadcrumbSchema, personSchema } from '@/lib/schema';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: site.description,
  alternates: { canonical: `${site.url}/about` },
};

/** Strips the review comments so they never reach the page. */
const clean = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '').trim();

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-hairline pb-20 pt-16 sm:pt-20">
        <Container>
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-display-l">
            We build the systems
            <br />
            businesses <em className="italic">run on.</em>
          </h1>
        </Container>
      </section>

      {/*
        "What is Fuchesi" — a single unambiguous paragraph, using the canonical
        description verbatim. This is the passage an AI assistant lifts when
        asked what the company is, so it names the company in the third person,
        states the category, and lists the services in plain language. It must
        stay identical to the description in metadata, Organization schema, and
        llms.txt.
      */}
      <Section tone="paper">
        <Container>
          <Reveal>
            <div className="grid gap-8 md:grid-cols-[10rem_1fr] md:gap-12">
              <h2 className="text-eyebrow uppercase text-muted">What is Fuchesi</h2>
              <div>
                <p className="max-w-[62ch] text-body-l text-ink">{site.description}</p>
                <p className="mt-6 max-w-[62ch] text-body-m text-muted">
                  We have delivered {projects.length} projects across commerce, healthcare,
                  property, finance, recruitment, education, and legal services — public products,
                  internal systems, and the automation that sits between them. Every project starts
                  with discovery, and every one can end with us telling you that you do not need it.
                </p>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <Reveal>
            <Eyebrow>The team</Eyebrow>
            <h2 className="mt-6 max-w-2xl font-display text-display-m">Who you work with.</h2>
            <p className="mt-6 max-w-[62ch] text-body-m text-muted">
              Fuchesi is small on purpose. The people who scope your project are the people who
              build it — there is no handover to a team you have never met.
            </p>
          </Reveal>

          <ul className="mt-16 grid gap-12 sm:grid-cols-2">
            {site.founders.map((founder, i) => (
              <li key={founder.slug}>
                <Reveal delay={i * 80}>
                  <article id={founder.slug}>
                    {founder.photo ? (
                      <Image
                        src={founder.photo}
                        alt={`${founder.name}, ${founder.role} of ${site.name}`}
                        width={640}
                        height={800}
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="aspect-[4/5] w-full rounded-lg border border-hairline object-cover"
                      />
                    ) : (
                      /*
                        TODO: confirm — no founder photographs were supplied, so
                        this is an elegant placeholder rather than a stock face.
                        Needed: one portrait each for Farees Fatima and
                        M. Umer Saleem, ideally 4:5, min 640×800. Drop them in
                        public/team/ and set `photo` in lib/site.ts.
                      */
                      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg border border-hairline bg-paper">
                        <span className="font-display text-[4rem] text-ink/15">
                          {founder.name
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                      </div>
                    )}

                    <div className="mt-6 flex items-center gap-2.5">
                      <Emblem size={6} />
                      <span className="text-eyebrow uppercase text-muted">{founder.role}</span>
                    </div>
                    <h3 className="mt-3 font-display text-display-s">{founder.name}</h3>
                    <p className="mt-4 max-w-[52ch] text-body-m text-muted">{clean(founder.bio)}</p>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <ContactCta />

      {site.founders.map((founder) => (
        <JsonLd key={founder.slug} data={personSchema(founder)} />
      ))}
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
    </>
  );
}
