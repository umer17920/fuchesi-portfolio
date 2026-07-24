import type { ElementType, ReactNode } from 'react';

type ContainerProps = {
  children: ReactNode;
  /** `narrow` for reading measure (~68ch), `default` for layout, `wide` for full-bleed grids. */
  width?: 'narrow' | 'default' | 'wide';
  as?: ElementType;
  className?: string;
};

const widths = {
  narrow: 'max-w-[68ch]',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
} as const;

export function Container({
  children,
  width = 'default',
  as: Tag = 'div',
  className = '',
}: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full px-5 sm:px-8 ${widths[width]} ${className}`}>{children}</Tag>
  );
}
