import { Emblem } from '@/components/primitives/Emblem';

type TypographicCoverProps = {
  /** Position in the catalogue — set in the display serif as the cover's subject. */
  index: number;
  /** First tag, used as a quiet classifier. */
  tag?: string;
};

/**
 * Cover for projects with no screenshot — the 19 private builds with no public
 * URL, and any live project whose capture is pending.
 *
 * Deliberately does NOT show the project name: the card body already carries it
 * in an <h3>, and printing it here too was pure duplication. Instead the cover
 * treats the project as a catalogue entry — its number set large in the display
 * serif, with the emblem — which keeps every card structurally identical
 * whether it has a screenshot or not.
 *
 * Pure type and CSS: no image request, no lazy-load, no layout shift.
 */
export function TypographicCover({ index, tag }: TypographicCoverProps) {
  return (
    <div className="relative flex aspect-[16/10] flex-col justify-between overflow-hidden border-b border-hairline bg-paper-raised p-6">
      <div className="flex items-center justify-between text-eyebrow uppercase text-muted">
        <span>Fuchesi</span>
        <Emblem size={5} className="text-[var(--accent)]" />
      </div>

      <p
        aria-hidden="true"
        className="font-display text-[3.5rem] leading-none tracking-tight text-ink/20"
      >
        {String(index).padStart(2, '0')}
      </p>

      {tag && <p className="text-eyebrow uppercase text-muted">{tag}</p>}

      {/* Oversized emblem, cropped — echoes the hero's wordmark treatment. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border border-ink/[0.07]"
      />
    </div>
  );
}
