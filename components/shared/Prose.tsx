import { PortableText, type PortableTextComponents } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import Image from 'next/image';

/**
 * Renders Portable Text from the CMS.
 *
 * Every block type is mapped explicitly rather than relying on defaults, so an
 * editor cannot produce markup that escapes the design system. Measure is
 * capped near 68ch — the single biggest factor in whether long text is
 * readable.
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="mt-6 text-body-m text-ink-soft">{children}</p>,
    // Body headings start at H2: the page title owns the single H1, and a valid
    // heading outline is what lets screen readers and crawlers navigate.
    h2: ({ children }) => (
      <h2 className="mt-14 font-display text-display-s text-balance">{children}</h2>
    ),
    h3: ({ children }) => <h3 className="mt-10 text-body-l font-medium">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="mt-8 border-l-2 border-ink pl-6 font-display text-body-l italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="mt-6 space-y-2.5">{children}</ul>,
    number: ({ children }) => <ol className="mt-6 space-y-2.5">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="relative pl-6 text-body-m text-ink-soft before:absolute before:left-0 before:top-[0.65em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-ink/40">
        {children}
      </li>
    ),
    number: ({ children }) => (
      <li className="ml-5 list-decimal text-body-m text-ink-soft">{children}</li>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ children, value }) => {
      const href = String(value?.href ?? '');
      const external = href.startsWith('http');
      return (
        <a
          href={href}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          className="underline decoration-hairline underline-offset-4 transition-colors duration-300 hover:decoration-ink"
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      if (!value?.url) return null;
      return (
        <figure className="mt-10">
          <Image
            src={value.url}
            alt={value.alt ?? ''}
            width={1600}
            height={1000}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full rounded-lg border border-hairline"
          />
          {value.alt && <figcaption className="mt-3 text-body-s text-muted">{value.alt}</figcaption>}
        </figure>
      );
    },
  },
};

export function Prose({ value }: { value: PortableTextBlock[] }) {
  return (
    <div className="max-w-[68ch]">
      <PortableText value={value} components={components} />
    </div>
  );
}
