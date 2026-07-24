import status from '@/content/link-status.json';

/**
 * Verified reachability of each project's live URL, produced by
 * `node scripts/check-links.mjs`.
 *
 * The old site linked every project unconditionally; 11 of those 30 links now
 * lead to an expired certificate warning, a lapsed domain, or a 500. The site
 * therefore treats an unverified URL as no URL — a project with a dead link
 * renders as an unlinked card rather than sending a buyer to a browser
 * security interstitial.
 *
 * Re-run the checker before each deploy; these are third-party sites and their
 * status will keep drifting.
 */
export type LinkStatus = {
  ok: boolean;
  status: number;
  reason: string | null;
  checkedAt: string;
};

const map = status as Record<string, LinkStatus>;

/** True only when the URL was verified reachable. Unknown slugs are not linked. */
export const isLinkable = (slug: string): boolean => map[slug]?.ok === true;

export const linkStatus = (slug: string): LinkStatus | null => map[slug] ?? null;

export const brokenSlugs = Object.entries(map)
  .filter(([, v]) => !v.ok)
  .map(([slug]) => slug);
