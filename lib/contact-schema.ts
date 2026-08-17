import { z } from 'zod';
import { services } from './services';

/**
 * One schema, used by both the client form and the API route.
 *
 * Client-side validation is a convenience and nothing more — it can be bypassed
 * trivially. The route re-parses with this same schema, so the rules cannot
 * drift apart and the server never trusts the browser.
 */
export const serviceInterestValues = [
  ...services.map((s) => s.slug),
  'not-sure',
  'other',
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name.').max(100),
  email: z.string().trim().min(1, 'We need an email address to reply to.').email('That does not look like an email address.'),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  serviceInterest: z.enum(serviceInterestValues, {
    message: 'Please choose what this is about.',
  }),
  message: z
    .string()
    .trim()
    .min(10, 'A sentence or two is plenty, just enough to know what this is about.')
    .max(5000, 'That is longer than our form allows. Email us directly and we will read all of it.'),
  /**
   * Honeypot. Real people never see or fill this; bots fill every field they
   * find. A quiet, dependency-free filter that costs a legitimate user nothing.
   *
   * Deliberately NOT max(0): rejecting here would fail validation and hand the
   * bot a field-level error naming the trap, teaching it exactly which input to
   * leave alone next time. The routes accept a filled honeypot with a cheerful
   * 200 and quietly discard it instead — see the `if (website)` checks.
   */
  website: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const serviceOptions = [
  ...services.map((s) => ({ value: s.slug, label: s.name })),
  { value: 'not-sure', label: 'Not sure yet' },
  { value: 'other', label: 'Something else' },
];

/**
 * Meeting-request schema.
 *
 * A real booking against live availability, not a free-text wish. The visitor
 * picks one generated slot and the client sends back its absolute start
 * instant, never a wall-clock string — "10:00" is meaningless without a zone,
 * and comparing zone-less strings is how double-bookings get in.
 *
 * This schema only checks shape. Whether the instant is a REAL slot (on a
 * business day, on a 30-minute boundary, inside the booking window) is decided
 * server-side by findSlotByStart in lib/booking/slots.ts, which regenerates the
 * day's slots and demands an exact match. The browser cannot widen that.
 */
export const bookingSchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name.').max(100),
  email: z
    .string()
    .trim()
    .min(1, 'We need an email address to confirm the meeting.')
    .email('That does not look like an email address.'),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  /** UTC ISO instant of the chosen slot's start. */
  slotStart: z
    .string()
    .trim()
    .min(1, 'Pick a time.')
    .max(40)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Pick a time.'),
  /** The visitor's IANA zone, so their local time is recorded alongside ours. */
  visitorTimeZone: z.string().trim().min(1).max(64),
  topic: z.enum(serviceInterestValues, { message: 'What is the meeting about?' }),
  message: z
    .string()
    .trim()
    .max(2000, 'That is longer than this field allows.')
    .optional()
    .or(z.literal('')),
  website: z.string().max(200).optional(), // honeypot — see contactSchema
});

export type BookingInput = z.infer<typeof bookingSchema>;
