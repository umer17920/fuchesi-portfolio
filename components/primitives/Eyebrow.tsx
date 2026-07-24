import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Emblem } from './Emblem';

type EyebrowProps = {
  children: ReactNode;
  className?: string;
  // Rest props forwarded so callers can attach `data-enter` for the route
  // stagger without this component knowing the motion layer exists.
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'children'>;

/** Small uppercase section label, marked with the wordmark's emblem. */
export function Eyebrow({ children, className = '', ...rest }: EyebrowProps) {
  return (
    <p
      className={`flex items-center gap-2.5 text-eyebrow uppercase text-[var(--accent)] ${className}`}
      {...rest}
    >
      <Emblem size={6} />
      {children}
    </p>
  );
}
