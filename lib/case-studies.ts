import type { PortableTextBlock } from '@portabletext/types';
import { seedCaseStudies } from '@/content/case-studies.seed';
import { client } from './sanity/client';

/**
 * Case studies, from Sanity when configured and from local seed content
 * otherwise.
 *
 * This previously had no seed fallback, on the grounds that a case study needs
 * a real challenge, a real solution and real measured results, none of which
 * can be invented on a client's behalf. That reasoning holds and is why
 * content/case-studies.seed.ts carries null `results` and null `testimonial`
 * throughout: the challenge and solution describe the sector and the delivered
 * system, both of which are checkable, while a measured outcome for a named
 * third party is not ours to assert. The storage mechanism was never the
 * safeguard; the empty results block is.
 *
 * A CMS entry always wins over a seed entry with the same slug, so publishing
 * in Sanity later silently supersedes this file.
 *
 * `slug` matches the project slug in content/projects.seed.json, which is how a
 * case study and its index entry find each other.
 */
export type CaseStudyResult = { value: string; label: string };

export type CaseStudy = {
  slug: string;
  title: string;
  client: string | null;
  year: string | null;
  summary: string;
  services: string[];
  challenge: PortableTextBlock[];
  solution: PortableTextBlock[];
  results: CaseStudyResult[] | null;
  testimonial: { quote: string; attribution: string } | null;
  coverImage: { url: string; alt: string } | null;
  gallery: { url: string; alt: string }[] | null;
  featured: boolean;
  publishedAt: string;
  updatedAt: string | null;
};

const FIELDS = `
  "slug": slug.current,
  title,
  client,
  year,
  summary,
  services,
  challenge,
  solution,
  results[]{ value, label },
  testimonial{ quote, attribution },
  "coverImage": coverImage{ "url": asset->url, alt },
  "gallery": gallery[]{ "url": asset->url, alt },
  featured,
  publishedAt,
  updatedAt
`;

const byNewest = (a: CaseStudy, b: CaseStudy) => b.publishedAt.localeCompare(a.publishedAt);

export async function getCaseStudies(): Promise<CaseStudy[]> {
  if (!client) return [...seedCaseStudies].sort(byNewest);

  // A CMS entry supersedes the seed entry for the same slug, so a study can be
  // taken over in Sanity without first deleting it here.
  const published = await client.fetch<CaseStudy[]>(
    `*[_type == "caseStudy" && defined(slug.current)] | order(publishedAt desc){${FIELDS}}`,
    {},
    { next: { tags: ['caseStudy'] } },
  );

  const overridden = new Set(published.map((s) => s.slug));
  return [...published, ...seedCaseStudies.filter((s) => !overridden.has(s.slug))].sort(byNewest);
}

export async function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  const seed = seedCaseStudies.find((s) => s.slug === slug) ?? null;
  if (!client) return seed;

  const published = await client.fetch<CaseStudy | null>(
    `*[_type == "caseStudy" && slug.current == $slug][0]{${FIELDS}}`,
    { slug },
    { next: { tags: ['caseStudy', `caseStudy:${slug}`] } },
  );
  return published ?? seed;
}

/** Slugs that have a case study, so the work index knows what to link inward. */
export async function getCaseStudySlugs(): Promise<Set<string>> {
  const studies = await getCaseStudies();
  return new Set(studies.map((s) => s.slug));
}
