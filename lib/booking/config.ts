/**
 * Every rule about when meetings can happen, in one place.
 *
 * Changing your hours is a one-line edit here — slot generation, availability,
 * server-side validation and the UI all derive from these values, so they can
 * never drift out of sync.
 */
export const bookingConfig = {
  /**
   * The business timezone. Slots are DEFINED in this zone ("09:00 in Karachi")
   * and converted to absolute instants for storage and comparison. Visitors see
   * the same instants rendered in their own zone.
   *
   * Pakistan does not observe DST, so these conversions are stable year-round —
   * but the code goes through the IANA database anyway rather than hardcoding
   * +05:00, so nothing breaks if that ever changes.
   */
  timeZone: 'Asia/Karachi',
  timeZoneLabel: 'Pakistan time',

  /** Open every day. Weekday numbers, 0 = Sunday. */
  openDays: [0, 1, 2, 3, 4, 5, 6],

  /** 09:00 to 22:00 Pakistan time, as minutes from midnight. */
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 22 * 60,

  /** Slot length in minutes. 09:00–09:30, 09:30–10:00, … 21:30–22:00 = 26/day. */
  slotMinutes: 30,

  /**
   * Nothing can be booked inside this window. Protects against someone booking
   * a slot twenty minutes from now that you will never see in time.
   */
  leadTimeHours: 18,

  /** How far ahead the calendar is open. */
  horizonDays: 30,

  /**
   * How long an unconfirmed booking holds its slot before it is treated as
   * free again. The slot greys out instantly on request, but if the visitor
   * never clicks the confirmation link in their email, it quietly reopens
   * rather than being lost forever.
   */
  holdMinutes: 30,

  /** Meeting length shown to the visitor and written to the calendar event. */
  get durationLabel() {
    return `${this.slotMinutes} minutes`;
  },
} as const;

export type BookingConfig = typeof bookingConfig;
