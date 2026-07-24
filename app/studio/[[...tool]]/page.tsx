import { isSanityConfigured } from '@/lib/sanity/env';
import { StudioSetup } from './StudioSetup';
import { Studio } from './Studio';

export const dynamic = 'force-static';

// The studio is an editing tool, not content. Keep it out of search results and
// out of AI crawlers' indexes.
export const metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  // Without a project id the Sanity client cannot even be constructed, so show
  // setup instructions rather than letting the build fail. This is what makes
  // `npm run build` pass before credentials exist.
  if (!isSanityConfigured) return <StudioSetup />;
  return <Studio />;
}
