import type { Metadata } from 'next';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Emblem } from '@/components/primitives/Emblem';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { projects } from '@/lib/projects';
import { breadcrumbSchema } from '@/lib/schema';
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
                  property, finance, recruitment, education, and legal services. Some are public
                  products, some are internal systems, and a good deal of it is the automation that
                  sits between the two. Every project starts with discovery, and every one can end
                  with us telling you that you do not need it.
                </p>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      {/*
        How we work.

        This replaced two named founder profiles. It answers the questions
        buyers ask before they ask about technology (who touches the work, what
        happens before a quote, what you own, how fast you hear back), and each
        claim is stated elsewhere on the site already, so nothing here is a new
        promise the company has to keep.
      */}
      <Section tone="raised">
        <Container>
          <Reveal>
            <Eyebrow>How we work</Eyebrow>
            <h2 className="mt-6 max-w-2xl font-display text-display-m">What to expect.</h2>
            <p className="mt-6 max-w-[62ch] text-body-m text-muted">
              Four things hold true on every project, whatever it is we end up building.
            </p>
          </Reveal>

          <ul className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2">
            {site.howWeWork.map((item, i) => (
              <li key={item.title}>
                <Reveal delay={i * 80}>
                  <div className="flex items-center gap-2.5">
                    <Emblem size={6} />
                    <span className="text-eyebrow uppercase text-muted">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-display-s">{item.title}</h3>
                  <p className="mt-4 max-w-[52ch] text-body-m text-muted">{clean(item.body)}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <ContactCta />

      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
    </>
  );
}
