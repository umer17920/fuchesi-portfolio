import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { Prose } from '@/components/shared/Prose';
import { PublishedMeta } from '@/components/shared/PublishedMeta';
import { getCaseStudies, getCaseStudy } from '@/lib/case-studies';
import { isLinkable } from '@/lib/links';
import { getProject } from '@/lib/projects';
import { breadcrumbSchema, caseStudySchema } from '@/lib/schema';
import { services } from '@/lib/services';
import { getShot } from '@/lib/shots';
import { site } from '@/lib/site';

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const studies = await getCaseStudies();
  return studies.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const study = await getCaseStudy(slug);
  if (!study) return {};

  const url = `${site.url}/work/${study.slug}`;
  return {
    title: study.title,
    description: study.summary,
    alternates: { canonical: url },
    openGraph: {
      title: `${study.title} | ${site.name}`,
      description: study.summary,
      url,
      type: 'article',
      publishedTime: study.publishedAt,
      modifiedTime: study.updatedAt ?? study.publishedAt,
    },
  };
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const study = await getCaseStudy(slug);
  if (!study) notFound();

  // The migrated index entry, for tags and the live URL.
  const project = getProject(slug);
  const shot = getShot(slug);
  const liveUrl = project?.url && isLinkable(slug) ? project.url : null;

  const cover = study.coverImage ?? (shot ? { url: shot.src, alt: `${study.title}, the live site` } : null);
  const relatedServices = services.filter((s) => study.services?.includes(s.slug));

  return (
    <>
      <section className="border-b border-hairline pb-16 pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Case study</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-display-l">{study.title}</h1>
          <p className="mt-8 max-w-[62ch] text-body-l text-ink-soft">{study.summary}</p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            {study.client && (
              <div>
                <span className="text-eyebrow uppercase text-muted">Client</span>
                <p className="mt-1 text-body-s">{study.client}</p>
              </div>
            )}
            {study.year && (
              <div>
                <span className="text-eyebrow uppercase text-muted">Year</span>
                <p className="mt-1 text-body-s">{study.year}</p>
              </div>
            )}
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="self-end border-b border-hairline pb-1 text-body-s transition-colors duration-300 hover:border-ink"
              >
                Visit the live site ↗
              </a>
            )}
          </div>

          <PublishedMeta
            publishedAt={study.publishedAt}
            updatedAt={study.updatedAt}
            className="mt-8"
          />
        </Container>
      </section>

      {cover && (
        <Container width="wide" className="mt-12">
          <Image
            src={cover.url}
            alt={cover.alt ?? `${study.title}, project imagery`}
            width={1600}
            height={1000}
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="h-auto w-full rounded-lg border border-hairline"
          />
        </Container>
      )}

      {/* Challenge → Solution → Results, in that order. The structure is the
          point: it is how a buyer evaluates whether you have solved their
          problem before. */}
      <Section tone="paper">
        <Container>
          <Reveal>
            <div className="grid gap-4 md:grid-cols-[10rem_1fr] md:gap-12">
              <h2 className="text-eyebrow uppercase text-muted">The challenge</h2>
              <Prose value={study.challenge} />
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-20 grid gap-4 border-t border-hairline pt-20 md:grid-cols-[10rem_1fr] md:gap-12">
              <h2 className="text-eyebrow uppercase text-muted">The solution</h2>
              <Prose value={study.solution} />
            </div>
          </Reveal>
        </Container>
      </Section>

      {study.results && study.results.length > 0 && (
        <Section tone="emphasis">
          <Container>
            <Reveal>
              <h2 className="text-eyebrow uppercase text-on-emphasis/60">The results</h2>
              <dl className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {study.results.map((result) => (
                  <div key={result.label} className="border-t border-on-emphasis/20 pt-6">
                    <dt className="sr-only">{result.label}</dt>
                    <dd>
                      <span className="block font-display text-display-m">{result.value}</span>
                      <span className="mt-3 block text-body-s text-on-emphasis/60">{result.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </Container>
        </Section>
      )}

      {study.testimonial?.quote && (
        <Section tone="raised">
          <Container>
            <Reveal>
              <figure className="mx-auto max-w-3xl text-center">
                <blockquote className="font-display text-display-s text-balance">
                  “{study.testimonial.quote}”
                </blockquote>
                {study.testimonial.attribution && (
                  <figcaption className="mt-6 text-body-s text-muted">
                    {study.testimonial.attribution}
                  </figcaption>
                )}
              </figure>
            </Reveal>
          </Container>
        </Section>
      )}

      {study.gallery && study.gallery.length > 0 && (
        <Container width="wide" className="py-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {study.gallery.map((img) => (
              <Image
                key={img.url}
                src={img.url}
                alt={img.alt ?? ''}
                width={1200}
                height={800}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, 50vw"
                className="h-auto w-full rounded-lg border border-hairline"
              />
            ))}
          </div>
        </Container>
      )}

      {relatedServices.length > 0 && (
        <Section tone="paper">
          <Container>
            <h2 className="text-eyebrow uppercase text-muted">What this involved</h2>
            <ul className="mt-8 flex flex-wrap gap-3">
              {relatedServices.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex rounded-full border border-hairline px-5 py-2.5 text-body-s transition-colors duration-300 hover:border-ink"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}

      <ContactCta />

      <JsonLd
        data={caseStudySchema({
          slug: study.slug,
          title: study.title,
          summary: study.summary,
          client: study.client,
          services: study.services ?? [],
          publishedAt: study.publishedAt,
          updatedAt: study.updatedAt,
          image: cover?.url ?? null,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Work', path: '/work' },
          { name: study.title, path: `/work/${study.slug}` },
        ])}
      />
    </>
  );
}
