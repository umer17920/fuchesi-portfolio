import { NextResponse } from 'next/server';
import { isCalendarConfigured } from '@/lib/booking/calendar';
import { bookingConfig } from '@/lib/booking/config';
import { availabilityByDate, availabilityForDate } from '@/lib/booking/holds';
import { selectableDateRange, slotsForDate } from '@/lib/booking/slots';
import { isoDateInZone, parseIsoDate } from '@/lib/booking/time';

/**
 * Live slot availability.
 *
 * Two shapes:
 *   ?date=YYYY-MM-DD              one day's slots, each flagged available
 *   ?from=YYYY-MM-DD&to=…         free-slot counts per day, for greying out
 *                                 fully-booked dates in the picker
 *
 * Never cached. Netlify's CDN would happily serve a five-minute-old copy of
 * this, which is exactly how someone ends up booking a slot that was taken
 * four minutes ago.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };

/** Caps the range so a crafted query cannot ask for ten years of calendar. */
const MAX_RANGE_DAYS = 62;

function datesBetween(from: string, to: string): string[] {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return [];

  const cursor = Date.UTC(start.year, start.month - 1, start.day);
  const last = Date.UTC(end.year, end.month - 1, end.day);
  if (last < cursor) return [];

  const dates: string[] = [];
  for (let day = cursor; day <= last && dates.length < MAX_RANGE_DAYS; day += 86_400_000) {
    dates.push(new Date(day).toISOString().slice(0, 10));
  }
  return dates;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const range = selectableDateRange(now);

  const meta = {
    timeZone: bookingConfig.timeZone,
    timeZoneLabel: bookingConfig.timeZoneLabel,
    slotMinutes: bookingConfig.slotMinutes,
    leadTimeHours: bookingConfig.leadTimeHours,
    minDate: range.min,
    maxDate: range.max,
    today: isoDateInZone(now, bookingConfig.timeZone),
  };

  // Without a calendar we cannot know what is taken. Rather than break the
  // form, offer every in-window slot and tell the client it is unverified —
  // the booking route degrades to the same "request, not a booking" behaviour.
  if (!isCalendarConfigured()) {
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ ...meta, unverified: true, days: {} }, { headers: NO_STORE });

    const slots = slotsForDate(date).map((slot) => ({
      id: slot.id,
      startIso: slot.start.toISOString(),
      endIso: slot.end.toISOString(),
      available: slot.start >= new Date(now.getTime() + bookingConfig.leadTimeHours * 3_600_000),
    }));
    return NextResponse.json({ ...meta, date, unverified: true, slots }, { headers: NO_STORE });
  }

  try {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) {
      const dates = datesBetween(from, to);
      if (dates.length === 0) {
        return NextResponse.json({ error: 'Invalid range.' }, { status: 400, headers: NO_STORE });
      }
      const days = await availabilityByDate(dates, now);
      return NextResponse.json({ ...meta, days }, { headers: NO_STORE });
    }

    const date = searchParams.get('date');

    // No date and no range: the client just wants the booking window so it can
    // bound its date input.
    if (!date) return NextResponse.json(meta, { headers: NO_STORE });

    if (!parseIsoDate(date)) {
      return NextResponse.json({ error: 'Invalid date.' }, { status: 400, headers: NO_STORE });
    }

    const slots = await availabilityForDate(date, now);
    return NextResponse.json({ ...meta, date, slots }, { headers: NO_STORE });
  } catch (err) {
    console.error('Availability lookup failed:', err);
    return NextResponse.json(
      { error: 'unavailable', message: 'Could not read the calendar.' },
      { status: 503, headers: NO_STORE },
    );
  }
}
