import { site } from '@/lib/site';

/**
 * Minimal RFC 5545 calendar file, attached to confirmation emails.
 *
 * Why this exists: a service account cannot add attendees to a Google Calendar
 * event without Workspace domain-wide delegation, so the visitor never receives
 * a native Google invite. Attaching an .ics gets the meeting into their
 * calendar in one click from any mail client instead — Gmail, Outlook and Apple
 * Mail all recognise it.
 */

/** Escapes the characters RFC 5545 gives meaning to. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** 20260803T040000Z */
function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

/**
 * Folds lines to 75 octets, as the spec requires. Long descriptions otherwise
 * silently break in stricter parsers such as Outlook's.
 */
function fold(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;

  const out: string[] = [];
  let current = '';
  for (const char of line) {
    if (Buffer.byteLength(current + char, 'utf8') > 74) {
      out.push(current);
      current = ' ';
    }
    current += char;
  }
  if (current.trim()) out.push(current);
  return out.join('\r\n');
}

export type IcsInput = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  organiserEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  cancelled?: boolean;
};

export function buildIcs(input: IcsInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${site.name}//Booking//EN`,
    'CALSCALE:GREGORIAN',
    `METHOD:${input.cancelled ? 'CANCEL' : 'REQUEST'}`,
    'BEGIN:VEVENT',
    `UID:${input.uid}@${site.url.replace('https://', '')}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.start)}`,
    `DTEND:${stamp(input.end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    `ORGANIZER;CN=${escapeText(site.name)}:mailto:${input.organiserEmail}`,
    `ATTENDEE;CN=${escapeText(input.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${input.attendeeEmail}`,
    `STATUS:${input.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    `SEQUENCE:${input.cancelled ? 1 : 0}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(fold).join('\r\n');
}
