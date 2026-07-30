import { SCOPES, getAccessToken, serviceAccount } from '@/lib/google/auth';
import { bookingConfig } from './config';
import { parseIsoDate, wallTimeToInstant } from './time';

/**
 * Google Calendar as the source of truth for availability.
 *
 * Why the calendar rather than the submissions sheet: it already holds the
 * meetings you booked by phone, it can be edited from your phone with no admin
 * UI to build, and a spreadsheet append has no way to reject a duplicate. A
 * calendar with client-supplied event ids does — see claimSlot() in holds.ts.
 *
 * REST + fetch, no googleapis dependency, matching lib/sheets.ts.
 */

const API = 'https://www.googleapis.com/calendar/v3/calendars';

export function calendarId(): string | null {
  const id = process.env.GOOGLE_CALENDAR_ID;
  return id && id.trim() ? id.trim() : null;
}

export const isCalendarConfigured = () => serviceAccount() !== null && calendarId() !== null;

/** The private extended-property keys this app writes onto its own events. */
export const PROP = {
  state: 'fuchesiState',
  holdExpires: 'fuchesiHoldExpires',
  tokenHash: 'fuchesiTokenHash',
  visitorTz: 'fuchesiVisitorTz',
  visitorEmail: 'fuchesiVisitorEmail',
  visitorName: 'fuchesiVisitorName',
  topic: 'fuchesiTopic',
} as const;

export type BookingState = 'pending' | 'confirmed' | 'cancelled';

export type CalendarEvent = {
  id: string;
  etag?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/** A busy interval in absolute time, normalised from any event shape. */
export type BusyInterval = { startMs: number; endMs: number; event: CalendarEvent };

function endpoint(path = ''): string {
  const id = calendarId();
  if (!id) throw new Error('GOOGLE_CALENDAR_ID is not configured.');
  return `${API}/${encodeURIComponent(id)}/events${path}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken(SCOPES.calendar);
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * All events overlapping a window.
 *
 * singleEvents expands recurring events into their individual occurrences, so a
 * weekly "unavailable" block behaves exactly like 52 separate ones.
 */
export async function listEvents(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const url = new URL(endpoint());
  url.searchParams.set('timeMin', timeMin.toISOString());
  url.searchParams.set('timeMax', timeMax.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '2500');
  url.searchParams.set('showDeleted', 'false');

  const res = await fetch(url, { headers: await authHeaders(), cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Calendar list failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { items?: CalendarEvent[] };
  return json.items ?? [];
}

/**
 * Normalises an event to an absolute interval.
 *
 * All-day events arrive as `start.date` / `end.date` (end exclusive) with no
 * time or zone, so they are resolved against the business timezone — this is
 * what makes "block the whole of Friday" work as you would expect. Timed events
 * carry a real offset already.
 */
export function toInterval(event: CalendarEvent): BusyInterval | null {
  const { timeZone } = bookingConfig;

  if (event.start?.dateTime && event.end?.dateTime) {
    const startMs = new Date(event.start.dateTime).getTime();
    const endMs = new Date(event.end.dateTime).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
    return { startMs, endMs, event };
  }

  if (event.start?.date && event.end?.date) {
    const from = parseIsoDate(event.start.date);
    const to = parseIsoDate(event.end.date);
    if (!from || !to) return null;
    return {
      startMs: wallTimeToInstant(from.year, from.month, from.day, 0, timeZone).getTime(),
      endMs: wallTimeToInstant(to.year, to.month, to.day, 0, timeZone).getTime(),
      event,
    };
  }

  return null;
}

export type EventBody = {
  id?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  status?: 'confirmed' | 'tentative';
  transparency?: 'opaque' | 'transparent';
  extendedProperties?: { private?: Record<string, string> };
};

export type InsertResult =
  | { status: 'created'; event: CalendarEvent }
  | { status: 'conflict' }
  | { status: 'error'; message: string };

/**
 * Creates an event at a caller-chosen id.
 *
 * A 409 is not a failure here — it is the lock working. It means another
 * request already claimed this slot, and the caller decides what to do next.
 */
export async function insertEvent(body: EventBody): Promise<InsertResult> {
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });

    if (res.status === 409) return { status: 'conflict' };
    if (!res.ok) {
      const message = `Calendar insert failed: ${res.status} ${await res.text()}`;
      console.error(message);
      return { status: 'error', message };
    }
    return { status: 'created', event: (await res.json()) as CalendarEvent };
  } catch (err) {
    console.error('Calendar insert threw:', err);
    return { status: 'error', message: String(err) };
  }
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  try {
    const res = await fetch(`${endpoint()}/${encodeURIComponent(id)}`, {
      headers: await authHeaders(),
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error('Calendar get failed:', res.status, await res.text());
      return null;
    }
    return (await res.json()) as CalendarEvent;
  } catch (err) {
    console.error('Calendar get threw:', err);
    return null;
  }
}

export type PatchResult = { status: 'ok'; event: CalendarEvent } | { status: 'conflict' } | { status: 'error' };

/**
 * Updates an event, optionally guarded by its etag.
 *
 * With an etag the update is a compare-and-swap: Google returns 412 if anything
 * changed since it was read. That is what makes taking over an expired hold
 * safe — two requests racing to reclaim the same abandoned slot cannot both
 * succeed.
 */
export async function patchEvent(
  id: string,
  patch: Partial<EventBody>,
  etag?: string,
): Promise<PatchResult> {
  try {
    const headers = await authHeaders();
    if (etag) headers['If-Match'] = etag;

    const res = await fetch(`${endpoint()}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });

    if (res.status === 412 || res.status === 409) return { status: 'conflict' };
    if (!res.ok) {
      console.error('Calendar patch failed:', res.status, await res.text());
      return { status: 'error' };
    }
    return { status: 'ok', event: (await res.json()) as CalendarEvent };
  } catch (err) {
    console.error('Calendar patch threw:', err);
    return { status: 'error' };
  }
}
