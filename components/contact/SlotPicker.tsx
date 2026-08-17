'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The time grid: every 30-minute slot for the chosen date, with taken ones
 * greyed out and unclickable.
 *
 * Times are rendered in the VISITOR's timezone. The API deals only in absolute
 * instants, so the same slot reads 09:00 in Karachi and 06:00 in Dubai without
 * either side doing arithmetic — Intl does it against the IANA database.
 *
 * Unavailable slots deliberately do not say WHY they are unavailable. "Booked"
 * versus "blocked" would leak the owner's schedule to anyone who opened the
 * form.
 */

export type SlotOption = {
  id: string;
  startIso: string;
  endIso: string;
  available: boolean;
};

type AvailabilityResponse = {
  slots?: SlotOption[];
  timeZone: string;
  timeZoneLabel: string;
  unverified?: boolean;
  error?: string;
};

type Props = {
  date: string;
  value: string;
  onChange: (startIso: string) => void;
  visitorTimeZone: string;
  /** Bumped by the parent to force a refetch after losing a race. */
  refreshKey: number;
  describedBy?: string;
  invalid?: boolean;
};

function useTimeFormatter(timeZone: string) {
  return useCallback(
    (iso: string) =>
      new Intl.DateTimeFormat(undefined, {
        timeZone,
        hourCycle: 'h23',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso)),
    [timeZone],
  );
}

export function SlotPicker({
  date,
  value,
  onChange,
  visitorTimeZone,
  refreshKey,
  describedBy,
  invalid,
}: Props) {
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [businessZone, setBusinessZone] = useState<{ zone: string; label: string } | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const formatTime = useTimeFormatter(visitorTimeZone);

  useEffect(() => {
    if (!date) {
      setSlots(null);
      return;
    }

    const controller = new AbortController();
    setState('loading');

    fetch(`/api/availability?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = (await res.json()) as AvailabilityResponse;
        if (!res.ok) throw new Error(data.error ?? 'failed');
        setSlots(data.slots ?? []);
        setBusinessZone({ zone: data.timeZone, label: data.timeZoneLabel });
        setState('idle');
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSlots(null);
        setState('error');
      });

    return () => controller.abort();
  }, [date, refreshKey]);

  if (!date) {
    return (
      <p className="rounded-lg border border-dashed border-hairline px-4 py-6 text-body-s text-muted">
        Pick a date and the available times will appear here.
      </p>
    );
  }

  if (state === 'loading' && !slots) {
    return (
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        aria-busy="true"
        aria-label="Loading available times"
      >
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-lg bg-paper-raised" />
        ))}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <p role="alert" className="rounded-lg border border-hairline bg-paper-raised px-4 py-4 text-body-s">
        We could not load the times just now. Pick the date again, or email us and we will arrange it
        by hand.
      </p>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <p className="rounded-lg border border-hairline bg-paper-raised px-4 py-4 text-body-s text-muted">
        Nothing available on this date. Try another day.
      </p>
    );
  }

  const openCount = slots.filter((slot) => slot.available).length;

  if (openCount === 0) {
    return (
      <p className="rounded-lg border border-hairline bg-paper-raised px-4 py-4 text-body-s text-muted">
        Fully booked on this date. Try another day, as most have plenty of room.
      </p>
    );
  }

  const selected = slots.find((slot) => slot.startIso === value);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Available times"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${state === 'loading' ? 'opacity-60' : ''}`}
      >
        {slots.map((slot) => {
          const isSelected = slot.startIso === value;
          const label = `${formatTime(slot.startIso)}–${formatTime(slot.endIso)}`;

          return (
            <button
              key={slot.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!slot.available}
              onClick={() => onChange(slot.startIso)}
              aria-label={slot.available ? label : `${label}, unavailable`}
              className={[
                'rounded-lg border px-2 py-3 text-center text-body-s tabular-nums transition-colors duration-200',
                slot.available
                  ? isSelected
                    ? 'border-ink bg-ink font-medium text-paper'
                    : 'border-hairline bg-paper text-ink hover:border-ink'
                  : // Locked: dimmed, struck through, and not focusable. Reads as
                    // "spent" rather than "broken".
                    'cursor-not-allowed border-hairline/60 bg-paper-raised text-muted/60 line-through',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-body-s text-muted">
        {openCount} of {slots.length} times free. Shown in your timezone
        {visitorTimeZone ? ` (${visitorTimeZone.replace(/_/g, ' ')})` : ''}.
        {selected && businessZone ? (
          <>
            {' '}
            Your {formatTime(selected.startIso)} is{' '}
            <span className="text-ink">
              {new Intl.DateTimeFormat(undefined, {
                timeZone: businessZone.zone,
                hourCycle: 'h23',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(selected.startIso))}
            </span>{' '}
            {businessZone.label}.
          </>
        ) : null}
      </p>
    </div>
  );
}
