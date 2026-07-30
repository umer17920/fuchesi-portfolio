import crypto from 'node:crypto';
import { bookingConfig } from './config';
import {
  type CalendarEvent,
  PROP,
  insertEvent,
  getEvent,
  listEvents,
  patchEvent,
  toInterval,
} from './calendar';
import { type Slot, isWithinWindow, slotsForDate } from './slots';
import { formatDateTimeInZone, formatRangeInZone } from './time';

/**
 * Availability, holds, and the slot-claiming state machine.
 *
 * A slot is unavailable when ANY calendar event overlaps it. Events fall into
 * three groups, and the distinction only matters for events this app created:
 *
 *   - anything without our marker  → a real meeting or a manual block you made.
 *                                    Always blocking. This is what makes
 *                                    "mark a day unavailable" work with no
 *                                    admin UI: you just create an event.
 *   - confirmed booking            → blocking.
 *   - pending booking              → blocking until its hold expires, then it
 *                                    quietly reopens. No cron job: expiry is
 *                                    evaluated on read.
 */

export type SlotAvailability = {
  id: string;
  startIso: string;
  endIso: string;
  available: boolean;
};

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newConfirmationToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/** Whether an event should stop its slot being offered. */
export function isBlocking(event: CalendarEvent, now: Date): boolean {
  if (event.status === 'cancelled') return false;

  const props = event.extendedProperties?.private ?? {};
  const state = props[PROP.state];

  // No marker → not ours. A meeting you booked elsewhere, or a manual block.
  if (!state) return true;

  if (state === 'cancelled') return false;
  if (state === 'confirmed') return true;

  if (state === 'pending') {
    const expires = props[PROP.holdExpires];
    if (!expires) return true;
    const expiresAt = new Date(expires).getTime();
    if (Number.isNaN(expiresAt)) return true;
    return expiresAt > now.getTime();
  }

  return true;
}

function overlaps(slot: Slot, startMs: number, endMs: number): boolean {
  return startMs < slot.end.getTime() && endMs > slot.start.getTime();
}

/**
 * Availability for one date, in the business timezone.
 *
 * Fetches the day's events once and tests every slot against them in memory —
 * one API call per date change, not one per slot.
 */
export async function availabilityForDate(
  isoDate: string,
  now: Date = new Date(),
): Promise<SlotAvailability[]> {
  const slots = slotsForDate(isoDate);
  if (slots.length === 0) return [];

  const dayStart = slots[0].start;
  const dayEnd = slots[slots.length - 1].end;

  // Pad the query so an event starting before 09:00 or an all-day block is
  // still returned and can overlap the first slot.
  const events = await listEvents(
    new Date(dayStart.getTime() - 26 * 3_600_000),
    new Date(dayEnd.getTime() + 26 * 3_600_000),
  );

  const busy = events
    .filter((event) => isBlocking(event, now))
    .map(toInterval)
    .filter((interval): interval is NonNullable<typeof interval> => interval !== null);

  return slots.map((slot) => ({
    id: slot.id,
    startIso: slot.start.toISOString(),
    endIso: slot.end.toISOString(),
    available:
      isWithinWindow(slot, now) &&
      !busy.some((interval) => overlaps(slot, interval.startMs, interval.endMs)),
  }));
}

/**
 * Free-slot counts per date across a range — used to mark fully-booked days in
 * the date picker without one request per day.
 */
export async function availabilityByDate(
  isoDates: string[],
  now: Date = new Date(),
): Promise<Record<string, { total: number; available: number }>> {
  const byDate: Record<string, { total: number; available: number }> = {};
  const allSlots = isoDates.map((date) => ({ date, slots: slotsForDate(date) }));
  const populated = allSlots.filter((entry) => entry.slots.length > 0);

  for (const entry of allSlots) {
    byDate[entry.date] = { total: entry.slots.length, available: 0 };
  }
  if (populated.length === 0) return byDate;

  const rangeStart = populated[0].slots[0].start;
  const lastDay = populated[populated.length - 1].slots;
  const rangeEnd = lastDay[lastDay.length - 1].end;

  const events = await listEvents(
    new Date(rangeStart.getTime() - 26 * 3_600_000),
    new Date(rangeEnd.getTime() + 26 * 3_600_000),
  );
  const busy = events
    .filter((event) => isBlocking(event, now))
    .map(toInterval)
    .filter((interval): interval is NonNullable<typeof interval> => interval !== null);

  for (const entry of populated) {
    byDate[entry.date].available = entry.slots.filter(
      (slot) =>
        isWithinWindow(slot, now) &&
        !busy.some((interval) => overlaps(slot, interval.startMs, interval.endMs)),
    ).length;
  }
  return byDate;
}

export type ClaimDetails = {
  name: string;
  email: string;
  company?: string;
  topicLabel: string;
  message?: string;
  visitorTimeZone: string;
  requiresConfirmation: boolean;
  tokenHash: string;
};

export type ClaimResult =
  | { status: 'claimed'; eventId: string }
  | { status: 'taken' }
  | { status: 'error' };

function eventBodyFor(slot: Slot, details: ClaimDetails, now: Date) {
  const { timeZone, timeZoneLabel, holdMinutes } = bookingConfig;
  const state = details.requiresConfirmation ? 'pending' : 'confirmed';

  const description = [
    `Booked from the Fuchesi website.`,
    ``,
    `Name: ${details.name}`,
    `Email: ${details.email}`,
    ...(details.company ? [`Company: ${details.company}`] : []),
    `Topic: ${details.topicLabel}`,
    `Visitor timezone: ${details.visitorTimeZone}`,
    `Their local time: ${formatDateTimeInZone(slot.start, details.visitorTimeZone)}`,
    ...(details.message ? [``, details.message] : []),
    ``,
    details.requiresConfirmation
      ? `Awaiting email confirmation. Releases automatically if unconfirmed by ${formatDateTimeInZone(new Date(now.getTime() + holdMinutes * 60_000), timeZone)} ${timeZoneLabel}.`
      : `Confirmed.`,
  ].join('\n');

  const privateProps: Record<string, string> = {
    [PROP.state]: state,
    [PROP.tokenHash]: details.tokenHash,
    [PROP.visitorTz]: details.visitorTimeZone,
    [PROP.visitorEmail]: details.email,
    [PROP.visitorName]: details.name.slice(0, 200),
    [PROP.topic]: details.topicLabel.slice(0, 200),
  };
  if (details.requiresConfirmation) {
    privateProps[PROP.holdExpires] = new Date(now.getTime() + holdMinutes * 60_000).toISOString();
  }

  return {
    summary: `${details.requiresConfirmation ? 'Hold' : 'Meeting'} — ${details.name} (${details.topicLabel})`,
    description,
    start: { dateTime: slot.start.toISOString(), timeZone },
    end: { dateTime: slot.end.toISOString(), timeZone },
    status: (details.requiresConfirmation ? 'tentative' : 'confirmed') as 'tentative' | 'confirmed',
    transparency: 'opaque' as const,
    extendedProperties: { private: privateProps },
  };
}

/**
 * Claims a slot, atomically.
 *
 * Two paths, and the second is the subtle one:
 *
 *   1. insert at the slot's deterministic id. Google rejects a duplicate id
 *      with 409, so a straight race has exactly one winner.
 *   2. on 409 the slot may still be genuinely free — the existing event could
 *      be an expired hold or a cancellation. Deleting and re-inserting is not
 *      an option (Google will not let a deleted id be reused, which would burn
 *      the slot permanently), so the event is taken over in place with a
 *      compare-and-swap on its etag. Anyone else reclaiming it concurrently
 *      gets a 412 and loses cleanly.
 */
export async function claimSlot(
  slot: Slot,
  details: ClaimDetails,
  now: Date = new Date(),
): Promise<ClaimResult> {
  const body = eventBodyFor(slot, details, now);

  const inserted = await insertEvent({ id: slot.id, ...body });
  if (inserted.status === 'created') return { status: 'claimed', eventId: slot.id };
  if (inserted.status === 'error') return { status: 'error' };

  // 409 — something already occupies this id. Is it actually still blocking?
  const existing = await getEvent(slot.id);
  if (!existing) return { status: 'error' };
  if (isBlocking(existing, now)) return { status: 'taken' };

  const takeover = await patchEvent(slot.id, body, existing.etag);
  if (takeover.status === 'ok') return { status: 'claimed', eventId: slot.id };
  if (takeover.status === 'conflict') return { status: 'taken' };
  return { status: 'error' };
}

export type ResolveResult =
  | { status: 'ok'; event: CalendarEvent }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'alreadyCancelled' };

/**
 * Looks up a booking from a confirm/cancel link and verifies its token.
 *
 * The raw token only ever exists in the visitor's email; the calendar stores
 * its SHA-256. Compared with timingSafeEqual so the check cannot be probed
 * character by character.
 */
export async function resolveBooking(eventId: string, token: string): Promise<ResolveResult> {
  if (!/^[a-v0-9]{5,1024}$/.test(eventId)) return { status: 'invalid' };

  const event = await getEvent(eventId);
  if (!event) return { status: 'invalid' };

  const stored = event.extendedProperties?.private?.[PROP.tokenHash];
  if (!stored) return { status: 'invalid' };

  const provided = hashToken(token);
  const a = Buffer.from(stored);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { status: 'invalid' };

  const state = event.extendedProperties?.private?.[PROP.state];
  if (state === 'cancelled') return { status: 'alreadyCancelled' };

  if (state === 'pending' && !isBlocking(event, new Date())) return { status: 'expired' };

  return { status: 'ok', event };
}

/** Promotes a held booking to confirmed and clears its expiry. */
export async function confirmBooking(event: CalendarEvent): Promise<boolean> {
  const props = { ...(event.extendedProperties?.private ?? {}) };
  props[PROP.state] = 'confirmed';
  delete props[PROP.holdExpires];

  const result = await patchEvent(event.id, {
    status: 'confirmed',
    summary: (event.summary ?? 'Meeting').replace(/^Hold — /, 'Meeting — '),
    // Google removes a private property when its value is set to null; the
    // typed shape here is Record<string,string>, so send an empty string, which
    // isBlocking() treats as "no expiry set".
    extendedProperties: { private: { ...props, [PROP.holdExpires]: '' } },
  });
  return result.status === 'ok';
}

/** Cancels a booking and frees its slot. */
export async function cancelBooking(event: CalendarEvent): Promise<boolean> {
  const props = { ...(event.extendedProperties?.private ?? {}) };
  props[PROP.state] = 'cancelled';

  const result = await patchEvent(event.id, {
    summary: `Cancelled — ${(event.summary ?? '').replace(/^(Hold|Meeting) — /, '')}`,
    transparency: 'transparent',
    extendedProperties: { private: props },
  });
  return result.status === 'ok';
}

/** Human-readable slot description, for sheets and emails. */
export function describeSlot(slot: Slot, timeZone: string, label?: string): string {
  return formatRangeInZone(slot.start, slot.end, timeZone, label);
}
