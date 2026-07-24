import type { MetadataRoute } from 'next';
import { getCaseStudies } from '@/lib/case-studies';
import { getPosts } from '@/lib/posts';
import { services } from '@/lib/services';
import { site } from '@/lib/site';

/**
 * sitemap.xml
 *
 * lastmod is real, not `new Date()`. A sitemap that claims every page changed
 * today on every deploy is a sitemap crawlers learn to ignore — and it
 * contradicts the visible dates and schema's dateModified, which is exactly the
 * inconsistency we are trying to avoid. Static pages therefore carry no lastmod
 * at all rather than a fabricated one.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, caseStudies] = await Promise.all([getPosts(), getCaseStudies()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${site.url}/services`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${site.url}/work`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${site.url}/process`, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${site.url}/about`, changeFrequency: 'yearly', priority: 0.7 },
    { url: `${site.url}/insights`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${site.url}/contact`, changeFrequency: 'yearly', priority: 0.8 },
  ];

  const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${site.url}/services/${s.slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const caseStudyPages: MetadataRoute.Sitemap = caseStudies.map((cs) => ({
    url: `${site.url}/work/${cs.slug}`,
    lastModified: new Date(cs.updatedAt ?? cs.publishedAt),
    changeFrequency: 'yearly',
    priority: 0.7,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${site.url}/insights/${p.slug}`,
    lastModified: new Date(p.updatedAt ?? p.publishedAt),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  return [...staticPages, ...servicePages, ...caseStudyPages, ...postPages];
}
