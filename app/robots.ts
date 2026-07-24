import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/**
 * robots.txt
 *
 * Every AI crawler is allowed explicitly rather than relying on the wildcard.
 * Two reasons: some of these bots look for their own user-agent before
 * honouring `*`, and being explicit means a future contributor can see the
 * intent instead of assuming the omission was deliberate.
 *
 * These are distinct jobs and worth understanding before anyone "tidies" them:
 *   GPTBot          — OpenAI training crawler
 *   OAI-SearchBot   — indexes for ChatGPT Search results
 *   ChatGPT-User    — fetches a page live when a user's prompt needs it
 *   ClaudeBot       — Anthropic's crawler
 *   Claude-User     — live fetch on a user's behalf
 *   Claude-SearchBot— indexes for Claude's search
 *   PerplexityBot   — Perplexity's index
 *   Google-Extended — controls Gemini/Vertex use WITHOUT affecting Google
 *                     Search rank; disallowing it does not hurt SEO, and
 *                     allowing it does not help SEO. It is purely AI opt-in.
 *   CCBot           — Common Crawl, which feeds many downstream datasets
 *
 * Blocking any of these removes Fuchesi from that assistant's answers. That is
 * the whole point of the AEO work, so they stay allowed.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Bingbot',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  // /studio is an editing tool and /api has nothing to index.
  const disallow = ['/studio', '/studio/', '/api/'];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
