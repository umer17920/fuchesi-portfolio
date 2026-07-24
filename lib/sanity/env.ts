/**
 * Sanity configuration, read from the environment.
 *
 * Deliberately tolerant of being unset. The site must build and render with no
 * Sanity project at all — otherwise nobody could run `npm run build` until
 * credentials existed. When unconfigured, content falls back to local seed data
 * (see lib/posts.ts and lib/case-studies.ts) and /studio explains what to do.
 */
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '';
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-10-01';

/** True only when a real project is wired up. */
export const isSanityConfigured = projectId.length > 0;
