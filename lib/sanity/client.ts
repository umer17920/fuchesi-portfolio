import { createClient, type SanityClient } from 'next-sanity';
import imageUrlBuilder from '@sanity/image-url';
import type { Image } from 'sanity';
import { apiVersion, dataset, isSanityConfigured, projectId } from './env';

/** null when Sanity is not configured — callers fall back to seed content. */
export const client: SanityClient | null = isSanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      // Served from Sanity's CDN. Pages are statically generated and revalidated
      // by webhook, so we are not reading through this on the request path.
      useCdn: true,
      perspective: 'published',
    })
  : null;

const builder = client ? imageUrlBuilder(client) : null;

/**
 * Build a CDN URL for a Sanity image.
 *
 * Always call .width() so we never ship an original upload — an editor dropping
 * in a 6MB camera JPEG must not become a 6MB page.
 */
export function urlForImage(source: Image) {
  if (!builder) return null;
  return builder.image(source).auto('format').fit('max');
}
