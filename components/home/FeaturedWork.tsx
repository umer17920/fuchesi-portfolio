import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Section } from '@/components/primitives/Section';
import { ProjectCard } from '@/components/work/ProjectCard';
import { featuredProjects, projects } from '@/lib/projects';

export function FeaturedWork() {
  return (
    <Section tone="raised">
      <Container width="wide">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Eyebrow>Selected work</Eyebrow>
              <h2 className="mt-6 max-w-2xl font-display text-display-l">Built to be used.</h2>
            </div>
            <p className="max-w-sm text-body-s text-muted">
              {projects.length} projects across commerce, healthcare, property, finance,
              recruitment, and legal services.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/*
            No `priority` here. This section is well below the fold on Home, and
            marking these images priority preloaded three of them ahead of the
            font that gates LCP — pushing LCP from ~2s to 3.7s. priority is only
            ever correct for an above-the-fold LCP image.
          */}
          {featuredProjects.map((project, i) => (
            <Reveal key={project.slug} delay={i * 60} className="h-full">
              <ProjectCard project={project} index={project.order} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-3.5 text-body-s transition-[border-color,transform] duration-300 ease-[var(--ease-out-expo)] hover:border-ink motion-safe:hover:-translate-y-0.5"
          >
            See all {projects.length} projects
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </Container>
    </Section>
  );
}
