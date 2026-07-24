import type { PortableTextBlock } from '@portabletext/types';
import { client } from './sanity/client';

/**
 * Case studies, authored in Sanity.
 *
 * Unlike posts there is no seed fallback, and that is deliberate: a case study
 * needs the real challenge, the real solution, and real measured results, none
 * of which can be invented on a client's behalf. Until an entry exists, the
 * project simply appears on the work index with its name, description, tags,
 * and (if it verifies) a link — which is honest.
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

export async function getCaseStudies(): Promise<CaseStudy[]> {
  if (!client) return [];
  return client.fetch<CaseStudy[]>(
    `*[_type == "caseStudy" && defined(slug.current)] | order(publishedAt desc){${FIELDS}}`,
    {},
    { next: { tags: ['caseStudy'] } },
  );
}

export async function getCaseStudy(slug: string): Promise<CaseStudy | null> {
  if (!client) return null;
  return client.fetch<CaseStudy | null>(
    `*[_type == "caseStudy" && slug.current == $slug][0]{${FIELDS}}`,
    { slug },
    { next: { tags: ['caseStudy', `caseStudy:${slug}`] } },
  );
}

/** Slugs that have a case study, so the work index knows what to link inward. */
export async function getCaseStudySlugs(): Promise<Set<string>> {
  const studies = await getCaseStudies();
  return new Set(studies.map((s) => s.slug));
}
