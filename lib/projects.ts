import seed from '@/content/projects.seed.json';

/**
 * The 49 projects migrated from the previous site, preserving the original
 * names, descriptions, and tags verbatim.
 *
 * These back the /work index. The 6–8 flagship projects additionally get full
 * CMS-authored case studies (challenge → solution → results) in Sanity, keyed
 * by the same slug; see lib/sanity/queries.ts. A project appearing here does
 * not imply a case study exists for it.
 */

export type Project = {
  order: number;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  /** null for private builds with no public URL — 19 of the 49. */
  url: string | null;
  /** Retained only to trace entries back to the old site's generated cards. */
  legacyColor: string;
};

export const projects: Project[] = seed as Project[];

export const liveProjects = projects.filter((p) => p.url !== null);

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

/**
 * Slugs put forward for full case studies — projects with a verified-live URL
 * and a captured screenshot, spread across sectors.
 *
 * This list was rebuilt after the AI/software projects were removed (they
 * appeared on the codingthebrains.com portfolio). The four previous picks —
 * makergrid-ai, myspeakscore, stingrai, vaxsupport — were all in that removal
 * set, so featured now draws entirely from the remaining client sites.
 *
 * TODO: confirm — this selection is mine. Tell me which you actually want.
 * Each needs the real challenge, what was built, and 2–3 measurable results
 * from you; nothing here is invented.
 */
export const featuredSlugs = [
  'silver-halo',
  'elite-auto-hire',
  'hfx-calculator',
  'the-ip-centre',
  'skyways-executive-travel',
  'xtreme-pharmacy',
] as const;

export const featuredProjects = featuredSlugs
  .map((slug) => getProject(slug))
  .filter((p): p is Project => p !== undefined);
