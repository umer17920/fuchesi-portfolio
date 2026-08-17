import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { PublishedMeta } from '@/components/shared/PublishedMeta';
import { getPosts } from '@/lib/posts';
import { breadcrumbSchema, itemListSchema } from '@/lib/schema';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Insights',
  description:
    'Plain writing on custom software, ERP systems, AI calling agents, and automation: what works, what costs what, and when not to build.',
  alternates: { canonical: `${site.url}/insights` },
};

export default async function InsightsPage() {
  const posts = await getPosts();

  return (
    <>
      <section className="border-b border-hairline pb-20 pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Insights</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-display-l">Writing worth the time.</h1>
          <p className="mt-8 max-w-[62ch] text-body-l text-ink-soft">
            What things cost, what works, and when not to build at all. No thought leadership.
          </p>
        </Container>
      </section>

      <Section tone="paper">
        <Container>
          {posts.length === 0 ? (
            <p className="text-body-m text-muted">No posts yet.</p>
          ) : (
            <ul className="border-t border-hairline">
              {posts.map((post, i) => (
                <li key={post.slug}>
                  <Reveal delay={i * 50}>
                    <article className="border-b border-hairline">
                      <Link href={`/insights/${post.slug}`} className="group block py-10">
                        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr] md:gap-12">
                          <PublishedMeta
                            publishedAt={post.publishedAt}
                            updatedAt={post.updatedAt}
                            author={post.authorName}
                          />
                          <div>
                            <h2 className="font-display text-display-s text-balance transition-transform duration-500 ease-[var(--ease-out-expo)] motion-safe:group-hover:translate-x-1">
                              {post.title}
                            </h2>
                            <p className="mt-3 max-w-[62ch] text-body-m text-muted">
                              {post.excerpt}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>

      <ContactCta />

      <JsonLd
        data={itemListSchema(
          `${site.name} insights`,
          posts.map((post) => ({
            name: post.title,
            path: `/insights/${post.slug}`,
            description: post.excerpt,
          })),
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Insights', path: '/insights' },
        ])}
      />
    </>
  );
}
