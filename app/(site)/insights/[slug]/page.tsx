import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactCta } from '@/components/home/ContactCta';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { JsonLd } from '@/components/seo/JsonLd';
import { Prose } from '@/components/shared/Prose';
import { PublishedMeta } from '@/components/shared/PublishedMeta';
import { getPost, getPosts } from '@/lib/posts';
import { articleSchema, breadcrumbSchema } from '@/lib/schema';
import { site } from '@/lib/site';

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const url = `${site.url}/insights/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      ...(post.authorName ? { authors: [post.authorName] } : {}),
    },
  };
}

export default async function InsightPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <>
      <article>
        <header className="border-b border-hairline pb-12 pt-16 sm:pt-20">
          <Container width="narrow">
            <Eyebrow>Insight</Eyebrow>
            <h1 className="mt-7 font-display text-display-m text-balance">{post.title}</h1>
            <p className="mt-6 text-body-l text-ink-soft">{post.excerpt}</p>
            <PublishedMeta
              publishedAt={post.publishedAt}
              updatedAt={post.updatedAt}
              author={post.authorName}
              className="mt-8"
            />
          </Container>
        </header>

        {post.coverImage && (
          <Container width="default" className="mt-12">
            <Image
              src={post.coverImage.url}
              alt={post.coverImage.alt ?? ''}
              width={1600}
              height={900}
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="h-auto w-full rounded-lg border border-hairline"
            />
          </Container>
        )}

        <Container width="narrow" className="py-16">
          <Prose value={post.body} />
        </Container>
      </article>

      <Container width="narrow" className="border-t border-hairline py-12">
        <Link
          href="/insights"
          className="inline-flex items-center gap-2 text-body-s text-muted transition-colors duration-300 hover:text-ink"
        >
          <span aria-hidden="true">←</span> All insights
        </Link>
      </Container>

      <ContactCta />

      <JsonLd
        data={articleSchema({
          title: post.title,
          description: post.excerpt,
          slug: post.slug,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          image: post.coverImage?.url ?? null,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Insights', path: '/insights' },
          { name: post.title, path: `/insights/${post.slug}` },
        ])}
      />
    </>
  );
}
