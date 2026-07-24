import type { ReactNode } from 'react';

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  optional?: boolean;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

/**
 * Labelled form field with an accessible error.
 *
 * The error is wired via aria-describedby and announced with role="alert", so a
 * screen reader user learns what is wrong without having to hunt for red text.
 * aria-invalid marks the control itself.
 */
export function Field({ label, name, error, optional, children }: FieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-body-s font-medium">
        <span>{label}</span>
        {optional && <span className="text-body-s font-normal text-muted">Optional</span>}
      </label>

      <div className="mt-2">
        {children({
          id,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? errorId : undefined,
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-body-s text-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border bg-paper px-4 py-3 text-body-m text-ink transition-colors duration-200 ' +
  'placeholder:text-muted/70 border-hairline hover:border-muted/60 ' +
  'focus:border-ink focus:outline-none ' +
  // Invalid state must not rely on colour alone — the border thickens too.
  'aria-[invalid=true]:border-ink aria-[invalid=true]:border-2';
