import type { PortableTextBlock } from '@portabletext/types';
import { seedPosts } from '@/content/posts.seed';
import { client } from './sanity/client';

/**
 * Insight posts, from Sanity when configured and from local seed content
 * otherwise.
 *
 * Pages never learn which source they got — they call these functions and
 * render. That keeps the site buildable before credentials exist and means
 * switching the CMS on is an env-var change, not a code change.
 */
export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date. Rendered visibly and emitted as datePublished. */
  publishedAt: string;
  /** ISO date or null. Drives the visible "Updated" line, dateModified, and sitemap lastmod. */
  updatedAt: string | null;
  authorName: string | null;
  authorSlug: string | null;
  coverImage: { url: string; alt: string } | null;
  body: PortableTextBlock[];
};

const POST_FIELDS = `
  "slug": slug.current,
  title,
  excerpt,
  "publishedAt": publishedAt,
  "updatedAt": updatedAt,
  "authorName": author->name,
  "authorSlug": author->slug.current,
  "coverImage": coverImage{ "url": asset->url, alt },
  body
`;

export async function getPosts(): Promise<Post[]> {
  if (!client) {
    return [...seedPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  return client.fetch<Post[]>(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){${POST_FIELDS}}`,
    {},
    // Statically generated; revalidated on publish via the Sanity webhook.
    { next: { tags: ['post'] } },
  );
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!client) return seedPosts.find((p) => p.slug === slug) ?? null;
  return client.fetch<Post | null>(
    `*[_type == "post" && slug.current == $slug][0]{${POST_FIELDS}}`,
    { slug },
    { next: { tags: ['post', `post:${slug}`] } },
  );
}
