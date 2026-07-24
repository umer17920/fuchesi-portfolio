import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { AnimationProvider, PageWrapper } from '@/components/motion/AnimationProvider';
import { MotionLayer } from '@/components/motion/MotionLayer';
import { RevealProvider } from '@/components/motion/RevealProvider';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/schema';

/**
 * Site chrome. Everything under (site) is a public marketing page; /studio sits
 * outside this group and renders without it.
 *
 * Motion is orchestrated centrally rather than scattered across components:
 *   AnimationProvider  route leave/enter (the liquid wipe), intercepts links
 *   MotionLayer        magnetic CTAs — lazy, desktop-only
 *   RevealProvider     scroll reveals — one IntersectionObserver for the page
 *
 * The CSS PageTransition that used to wrap {children} is gone: AnimationProvider
 * now owns page choreography, and running both meant every navigation faded
 * twice.
 *
 * Organization and WebSite schema are emitted once here — every other schema
 * node (Service, Article, Person, Breadcrumb) references these by @id rather
 * than restating the company.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnimationProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-body-s focus:text-paper"
      >
        Skip to content
      </a>
      {/*
        Header and Footer sit OUTSIDE PageWrapper on purpose: the transition
        moves only page content, so the chrome stays perfectly still and is
        never covered. That continuity is the whole point — the structure holds
        and the content changes inside it.
      */}
      <Header />
      <main id="main">
        <PageWrapper>{children}</PageWrapper>
      </main>
      <Footer />

      <RevealProvider />
      <MotionLayer />

      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
    </AnimationProvider>
  );
}
