import type { CSSProperties, ElementType, ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** Stagger, in ms. Keep under ~200ms total across a group; longer reads as lag. */
  delay?: number;
  as?: ElementType;
  className?: string;
};

/**
 * Server component. Marks a subtree to fade/slide in when scrolled into view.
 * All behaviour lives in CSS + RevealProvider; this ships no JS of its own,
 * and its children are fully present in the server-rendered HTML.
 */
export function Reveal({ children, delay = 0, as: Tag = 'div', className }: RevealProps) {
  return (
    <Tag
      data-reveal=""
      className={className}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
