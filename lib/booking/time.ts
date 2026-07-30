/**
 * Timezone arithmetic, built on the IANA database via Intl — no date library.
 *
 * The whole booking system rests on one discipline: a moment in time is ALWAYS
 * an absolute instant (a Date / UTC ISO string). "09:00" on its own is not a
 * time, it is a time *and* a zone, and treating it as a bare string is how
 * double-bookings and off-by-five-hours bugs get in. Wall-clock strings exist
 * only at the two edges — generating slots from business hours, and rendering
 * labels for a human.
 */

/**
 * How far the given zone is from UTC at that instant, in milliseconds.
 *
 * Works by asking Intl what the wall clock reads in that zone, reinterpreting
 * those fields as if they were UTC, and taking the difference. This is the
 * standard trick for doing zone maths without a library, and it is DST-correct
 * because the offset is resolved at a specific instant rather than assumed.
 */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asIfUtc - instant.getTime();
}

/**
 * Turns a wall-clock time in a zone into the absolute instant it refers to.
 *
 * Resolved twice: the first offset is looked up using an approximate instant,
 * which can be wrong by an hour right at a DST boundary. Re-checking with the
 * corrected instant settles it. Pakistan has no DST so this never fires there,
 * but the booking system should not silently break if it is ever pointed at a
 * zone that does.
 */
export function wallTimeToInstant(
  year: number,
  month: number,
  day: number,
  minutesFromMidnight: number,
  timeZone: string,
): Date {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const naive = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  const firstGuess = zoneOffsetMs(new Date(naive), timeZone);
  let instant = new Date(naive - firstGuess);
  const settled = zoneOffsetMs(instant, timeZone);
  if (settled !== firstGuess) instant = new Date(naive - settled);
  return instant;
}

/** Calendar date fields as they read in the given zone. */
export function ymdInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** YYYY-MM-DD as it reads in the given zone. */
export function isoDateInZone(instant: Date, timeZone: string): string {
  const { year, month, day } = ymdInZone(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Weekday index in the given zone, 0 = Sunday. */
export function weekdayInZone(instant: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/** "09:00" in the given zone. */
export function formatTimeInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(instant);
}

/** "Mon 3 Aug 2026, 09:00" in the given zone. */
export function formatDateTimeInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(instant);
}

/**
 * "Mon 3 Aug 2026, 09:00–09:30 (Pakistan time)" — the human-facing description
 * of a booked slot, used in the sheet, emails and the calendar event.
 */
export function formatRangeInZone(
  start: Date,
  end: Date,
  timeZone: string,
  label?: string,
): string {
  const suffix = label ? ` (${label})` : '';
  return `${formatDateTimeInZone(start, timeZone)}–${formatTimeInZone(end, timeZone)}${suffix}`;
}

/** Parses YYYY-MM-DD strictly. Returns null on anything malformed. */
export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject dates that do not exist, e.g. 2026-02-30.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return { year, month, day };
}

/**
 * Whether a string is an IANA zone this runtime recognises. Visitor-supplied,
 * so it is never trusted — an unknown zone would otherwise throw inside Intl
 * and take the whole request down.
 */
export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Short zone name for display, e.g. "GMT+4". Falls back to the raw id. */
export function zoneAbbreviation(instant: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(instant);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}
