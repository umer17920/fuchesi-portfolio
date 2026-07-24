type EmblemProps = {
  /** Rendered size in px. Defaults to a size that sits well beside body text. */
  size?: number;
  className?: string;
};

/**
 * The circular mark from above the İ in the wordmark, lifted out as a
 * standalone motif — the one distinctive shape the brand owns.
 *
 * Used as list bullets, eyebrow marks, active/hover states, and the unit the
 * language waveform on the AI calling agents page is built from. This threads
 * the identity through the site without ever touching the logo file itself.
 *
 * TODO: confirm — drawn as a true circle from the wordmark description. Needs
 * checking against fuchesi.png once supplied; if the emblem is offset, has a
 * counter, or isn't perfectly round, this should match it exactly.
 */
export function Emblem({ size = 8, className }: EmblemProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        flexShrink: 0,
      }}
    />
  );
}
