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
    .min(10, 'A sentence or two is plenty — just enough to know what this is about.')
    .max(5000, 'That is longer than our form allows. Email us directly and we will read all of it.'),
  /**
   * Honeypot. Real people never see or fill this; bots fill every field they
   * find. A quiet, dependency-free filter that costs a legitimate user nothing.
   */
  website: z.string().max(0).optional(),
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
 * This is a *request*, not a live calendar booking: it records the visitor's
 * preferred date and time as a row, it does not check real availability or
 * block a calendar (that would need Cal.com/Calendly). Same honeypot, same
 * server-revalidation contract as the message form.
 */
export const bookingSchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name.').max(100),
  email: z
    .string()
    .trim()
    .min(1, 'We need an email address to confirm the meeting.')
    .email('That does not look like an email address.'),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  // Kept as strings: the browser's native date/time inputs already constrain
  // the format, and we store them verbatim in the sheet rather than parsing.
  preferredDate: z.string().trim().min(1, 'Pick a preferred date.').max(40),
  preferredTime: z.string().trim().min(1, 'Pick a preferred time.').max(40),
  topic: z.enum(serviceInterestValues, { message: 'What is the meeting about?' }),
  message: z
    .string()
    .trim()
    .max(2000, 'That is longer than this field allows.')
    .optional()
    .or(z.literal('')),
  website: z.string().max(0).optional(), // honeypot
});

export type BookingInput = z.infer<typeof bookingSchema>;
