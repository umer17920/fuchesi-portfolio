import { getPosts } from '@/lib/posts';
import { site } from '@/lib/site';

/**
 * RSS 2.0 feed for /insights.
 *
 * Worth having for two reasons beyond the handful of people still running a
 * reader. Aggregators and newsletter tools discover writing through feeds, and
 * that discovery is one of the few honest routes to an inbound link. Several
 * AI crawlers also treat a feed as the canonical list of what is new, which
 * beats re-crawling an index page and guessing.
 *
 * Built from the same getPosts() the pages use, so it cannot drift from what
 * is published. Static, and revalidated by the Sanity webhook like everything
 * else.
 */
export const dynamic = 'force-static';

/** XML text nodes must not carry raw markup, and an unescaped & breaks parsers. */
const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Strip the client review comments; they are notes, not content. */
const clean = (value: string) =>
  value.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();

export async function GET() {
  const posts = await getPosts();

  const items = posts
    .map((post) => {
      const url = `${site.url}/insights/${post.slug}`;
      // RFC 822 is what RSS 2.0 requires; ISO dates are silently ignored by
      // some readers, which is the kind of bug nobody notices for months.
      const date = new Date(post.updatedAt ?? post.publishedAt).toUTCString();
      return [
        '    <item>',
        `      <title>${escape(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${date}</pubDate>`,
        `      <description>${escape(clean(post.excerpt))}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escape(site.name)} Insights</title>`,
    `    <link>${site.url}/insights</link>`,
    `    <description>${escape(site.shortDescription)}</description>`,
    '    <language>en-gb</language>',
    `    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
