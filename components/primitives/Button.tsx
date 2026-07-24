import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * `inverse` / `inverse-outline` are for the obsidian hero, whose ground is dark
 * in BOTH themes. They deliberately bypass the theme tokens — `primary` there
 * would be a near-black button on a near-black background in light mode.
 */
type Variant = 'primary' | 'secondary' | 'inverse' | 'inverse-outline';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-body-s font-medium ' +
  // Only transform/opacity/colour animate here — nothing that triggers layout.
  'transition-[transform,background-color,color,border-color] duration-300 ease-[var(--ease-out-expo)] ' +
  'motion-safe:hover:-translate-y-0.5';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  secondary: 'border border-hairline text-ink hover:border-ink',
  inverse:
    'bg-[var(--color-on-obsidian)] text-[var(--color-obsidian)] hover:opacity-90',
  'inverse-outline':
    'border border-[color-mix(in_srgb,var(--color-on-obsidian)_30%,transparent)] text-[var(--color-on-obsidian)] hover:border-[var(--color-on-obsidian)]',
};

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
  // Rest props are forwarded so callers can attach behaviour attributes —
  // notably `data-magnetic` and `data-enter`, which the motion layer queries
  // for. Without this they would be silently dropped and the effect would just
  // never happen, with nothing to debug.
} & Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'className' | 'children'>;

export function ButtonLink({
  href,
  variant = 'primary',
  children,
  className = '',
  ...rest
}: ButtonLinkProps) {
  const external = href.startsWith('http') || href.startsWith('mailto:');
  const cls = `${base} ${variants[variant]} ${className}`;

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = 'primary', children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
