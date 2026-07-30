import { bookingConfig } from './config';
import {
  isoDateInZone,
  parseIsoDate,
  wallTimeToInstant,
  weekdayInZone,
} from './time';

/**
 * Slot generation — the single definition of "what times exist".
 *
 * Both the availability endpoint and the booking endpoint derive slots from
 * here, so the server can never accept a time the UI would not have offered.
 * A visitor editing the request payload by hand gets rejected by the same
 * function that drew the grid.
 */

export type Slot = {
  /** Stable identifier, also used verbatim as the Google Calendar event id. */
  id: string;
  start: Date;
  end: Date;
};

/**
 * Deterministic per-slot id, derived from the UTC instant.
 *
 * Deterministic on purpose: it is what makes claiming a slot atomic. Google
 * rejects a second insert with the same event id, so two simultaneous requests
 * cannot both win — the database does the locking, with no lock table.
 *
 * Google constrains event ids to base32hex (0-9 and a-v) and at least 5
 * characters. "fuchesi" plus digits satisfies that; letters beyond v (w-z)
 * would be rejected, which is why the prefix is not something like "wsite".
 */
export function slotIdFor(start: Date): string {
  const iso = start.toISOString(); // 2026-08-03T04:00:00.000Z
  return `fuchesi${iso.slice(0, 16).replace(/[-:T]/g, '')}`;
}

/** Every slot that exists on a given calendar date, ignoring availability. */
export function slotsForDate(isoDate: string): Slot[] {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return [];

  const { timeZone, dayStartMinutes, dayEndMinutes, slotMinutes, openDays } = bookingConfig;

  // Probe the middle of the day to read its weekday — midnight can land on the
  // previous day in some zones once the offset is applied.
  const probe = wallTimeToInstant(parsed.year, parsed.month, parsed.day, 12 * 60, timeZone);
  // `as const` on the config narrows openDays to a tuple of literals; widen it
  // so an arbitrary weekday number can be tested against it.
  if (!(openDays as readonly number[]).includes(weekdayInZone(probe, timeZone))) return [];

  const slots: Slot[] = [];
  for (let minutes = dayStartMinutes; minutes + slotMinutes <= dayEndMinutes; minutes += slotMinutes) {
    const start = wallTimeToInstant(parsed.year, parsed.month, parsed.day, minutes, timeZone);
    const end = new Date(start.getTime() + slotMinutes * 60_000);
    slots.push({ id: slotIdFor(start), start, end });
  }
  return slots;
}

/**
 * The window a visitor is allowed to book inside: not sooner than the lead
 * time, not further out than the horizon.
 */
export function bookableWindow(now: Date = new Date()) {
  return {
    earliest: new Date(now.getTime() + bookingConfig.leadTimeHours * 3_600_000),
    latest: new Date(now.getTime() + bookingConfig.horizonDays * 86_400_000),
  };
}

/** Whether a slot falls inside the bookable window. */
export function isWithinWindow(slot: Slot, now: Date = new Date()): boolean {
  const { earliest, latest } = bookableWindow(now);
  return slot.start >= earliest && slot.start <= latest;
}

/**
 * The first and last dates worth showing in the date picker, as YYYY-MM-DD in
 * the business timezone.
 */
export function selectableDateRange(now: Date = new Date()) {
  const { earliest, latest } = bookableWindow(now);
  return {
    min: isoDateInZone(earliest, bookingConfig.timeZone),
    max: isoDateInZone(latest, bookingConfig.timeZone),
  };
}

/**
 * Resolves a client-supplied ISO instant back to a real slot, or null.
 *
 * Never trusts the string: it regenerates that date's slots and requires an
 * exact instant match, so "09:07" or a time outside business hours cannot be
 * smuggled through even though it parses as a valid date.
 */
export function findSlotByStart(startIso: string): Slot | null {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;

  const isoDate = isoDateInZone(start, bookingConfig.timeZone);
  const slot = slotsForDate(isoDate).find((candidate) => candidate.start.getTime() === start.getTime());
  return slot ?? null;
}
