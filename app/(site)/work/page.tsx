import type { Metadata } from 'next';
import { ContactCta } from '@/components/home/ContactCta';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { ProjectCard } from '@/components/work/ProjectCard';
import { getCaseStudySlugs } from '@/lib/case-studies';
import { projects } from '@/lib/projects';
import { breadcrumbSchema } from '@/lib/schema';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Work',
  description: `${projects.length} projects across commerce, healthcare, property, finance, recruitment, education, and legal services.`,
  alternates: { canonical: `${site.url}/work` },
};

export default async function WorkPage() {
  // Projects with a full case study link inward; the rest link to their live
  // site if it verifies, or don't link at all.
  const caseStudySlugs = await getCaseStudySlugs();

  return (
    <>
      <section className="border-b border-hairline pb-20 pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Work</Eyebrow>
          <h1 className="mt-7 max-w-4xl font-display text-display-l">Built to be used.</h1>
          <p className="mt-8 max-w-[62ch] text-body-l text-ink-soft">
            {projects.length} projects across commerce, healthcare, property, finance, recruitment,
            education, and legal services. Some are public products, some are internal systems only
            their teams will ever see.
          </p>
        </Container>
      </section>

      <Section tone="raised">
        <Container width="wide">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <li key={project.slug}>
                <Reveal delay={Math.min(i, 5) * 50} className="h-full">
                  <ProjectCard
                    project={project}
                    index={project.order}
                    /*
                     * All 49 lazy-load. Even here the grid sits below a text
                     * hero, so no card is the LCP element — and priority on a
                     * below-fold image steals bandwidth from the fonts that
                     * are. Lazy-loading is also what keeps a 49-image page
                     * cheap: the browser fetches only what gets scrolled to.
                     */
                    caseStudyHref={
                      caseStudySlugs.has(project.slug) ? `/work/${project.slug}` : undefined
                    }
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <ContactCta />

      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Work', path: '/work' },
        ])}
      />
    </>
  );
}
