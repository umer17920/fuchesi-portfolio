import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { ThemeScript } from '@/components/theme/ThemeScript';
import { site } from '@/lib/site';
import './globals.css';

/**
 * Root layout: document shell only.
 *
 * Site chrome (header, footer, reveals) lives in app/(site)/layout.tsx so that
 * /studio can render bare — the CMS is a tool, not a page of the website, and
 * should not sit inside our navigation.
 *
 * next/font downloads both faces at build time and serves them from our own
 * origin — no runtime request to Google, no preconnect needed — and generates
 * a size-adjusted local fallback so the swap causes zero layout shift.
 */

/**
 * Source Serif 4, not a Didone.
 *
 * The first pass used Bodoni Moda, whose extreme stroke contrast is the genre's
 * defining feature — which meant hairlines breaking up and straining to read at
 * text sizes, and a fashion/luxury genre signal this company does not want.
 * Source Serif has an even stroke, was drawn for screen rendering, and reads
 * technical-editorial while still harmonising with the serif wordmark.
 */
const serif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  style: ['normal', 'italic'],
  // Not preloaded, deliberately. The LCP element is body copy set in Inter, and
  // preloading the serif made three font files compete for bandwidth before
  // the one that actually gates LCP could arrive. The serif still loads
  // immediately after and swaps into headings against a metric-matched
  // fallback, so nothing shifts.
  preload: false,
});

/**
 * Inter carries body copy, which is the LCP element on most pages.
 *
 * `swap`, not `optional`. `optional` was tried specifically to stop the
 * font-swap repaint re-registering as a late LCP candidate, and it moved LCP by
 * nothing (3.7s → 3.8s, inside noise). The LCP cost here is bandwidth
 * contention on a saturated link, not the swap — so `optional` was pure design
 * cost (body copy stuck in the fallback on slow first visits) for zero measured
 * gain. Do not re-apply it without measuring first.
 *
 * next/font generates a size-adjusted fallback whose metrics match Inter, so
 * the swap itself shifts nothing — CLS stays at 0.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  // Preloaded: this is the LCP font on most pages.
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Custom software, ERP systems, and AI automation`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  // The home page is the canonical root. Inner pages set their own; without a
  // default here, any URL reached with a tracking query string can be indexed
  // as a separate page competing with the original.
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': `${site.url}/feed.xml` },
  },
  openGraph: {
    type: 'website',
    siteName: site.name,
    url: site.url,
    title: `${site.name} | Custom software, ERP systems, and AI automation`,
    description: site.shortDescription,
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} | Custom software, ERP systems, and AI automation`,
    description: site.shortDescription,
  },
  robots: {
    index: true,
    follow: true,
    // Let search engines show full-length previews and thumbnails. The defaults
    // are conservative and truncate snippets, which is exactly the text an AI
    // summary is built from.
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

/**
 * Matches the browser chrome (mobile address bar) to the active theme. Values
 * are the literal --color-paper token for each theme; keep them in sync with
 * globals.css.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0e' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script below adds a `js` class to
    // this element before React hydrates, so the server and client className
    // necessarily differ. Scoped to <html>'s own attributes — children are
    // still fully hydration-checked.
    <html
      lang="en"
      className={`${serif.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Sets both the theme and the `js` class before first paint, in one
          synchronous pass. It carries two separate responsibilities that both
          have to happen pre-paint:

          · `dark` — or the page paints light and then snaps to dark.
          · `js`   — the reveal system's hidden state is scoped to it, so
                     without JS every [data-reveal] element stays plainly
                     visible, which is exactly what we want for AI crawlers
                     that fetch without executing scripts.

          Must stay inline and synchronous. See ThemeScript.tsx.
        */}
        <ThemeScript />
      </head>
      <body className="bg-paper text-ink font-sans">{children}</body>
    </html>
  );
}
