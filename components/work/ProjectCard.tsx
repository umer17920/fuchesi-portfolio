import Image from 'next/image';
import Link from 'next/link';
import { isLinkable } from '@/lib/links';
import { getShot } from '@/lib/shots';
import type { Project } from '@/lib/projects';
import { TypographicCover } from './TypographicCover';

type ProjectCardProps = {
  project: Project;
  index: number;
  /** True for the first row above the fold — skips lazy-loading. */
  priority?: boolean;
  /** When a full case study exists, the card links to it instead of the live site. */
  caseStudyHref?: string;
};

export function ProjectCard({ project, index, priority = false, caseStudyHref }: ProjectCardProps) {
  const shot = getShot(project.slug);

  // Only link out to a URL that actually verified. 11 of the 30 project links
  // inherited from the old site are dead (lapsed domains, expired certs, 500s),
  // and sending a buyer to a security warning is worse than no link at all.
  const liveUrl = project.url && isLinkable(project.slug) ? project.url : null;

  const href = caseStudyHref ?? liveUrl;
  const isExternal = !caseStudyHref && Boolean(liveUrl);

  const cover = shot ? (
    <div className="relative aspect-[16/10] overflow-hidden border-b border-hairline bg-paper-raised">
      <Image
        src={shot.src}
        alt={`${project.name}, screenshot of the live site`}
        width={shot.width}
        height={shot.height}
        // Explicit sizes keeps the browser from downloading a 1600px image for
        // a 380px card slot on mobile.
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className="h-full w-full object-cover object-top transition-transform duration-700 ease-[var(--ease-out-expo)] motion-safe:group-hover:scale-[1.02]"
      />
    </div>
  ) : (
    <TypographicCover index={index} tag={project.tags[0]} />
  );

  const body = (
    <>
      {cover}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-display-s">{project.name}</h3>
          {isExternal && (
            <span
              aria-hidden="true"
              className="mt-1 shrink-0 text-muted transition-transform duration-300 ease-[var(--ease-out-expo)] motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
            >
              ↗
            </span>
          )}
        </div>

        <p className="mt-3 flex-1 text-body-s text-muted">{project.description}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-hairline px-3 py-1 text-eyebrow uppercase text-muted"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  const cls =
    'group flex h-full flex-col overflow-hidden rounded-lg border border-hairline bg-paper transition-[transform,border-color] duration-500 ease-[var(--ease-out-expo)] hover:border-ink/25 motion-safe:hover:-translate-y-1';

  if (!href) {
    // Either a private build (19 of the 49) or a project whose live site no
    // longer verifies. Both render as an unlinked card.
    return <article className={cls}>{body}</article>;
  }

  if (isExternal) {
    return (
      <article className={cls}>
        <a href={href} target="_blank" rel="noreferrer" className="flex h-full flex-col">
          {body}
          <span className="sr-only">(opens the live site in a new tab)</span>
        </a>
      </article>
    );
  }

  return (
    <article className={cls}>
      <Link href={href} className="flex h-full flex-col">
        {body}
      </Link>
    </article>
  );
}
