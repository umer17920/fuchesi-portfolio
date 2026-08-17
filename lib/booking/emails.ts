import { site } from '@/lib/site';
import { detailRows, emailLayout, escapeHtml, ownerEmail, sendMail } from '@/lib/email';
import { bookingConfig } from './config';
import { buildIcs } from './ics';
import type { Slot } from './slots';
import { formatDateTimeInZone, formatRangeInZone, zoneAbbreviation } from './time';

/**
 * The three messages a booking can send: hold ("confirm to lock this in"),
 * confirmation (with the .ics), and the owner's notification.
 *
 * Links carry an absolute origin passed in from the request rather than
 * site.url, so a confirmation link works on the Netlify preview domain and on
 * the custom domain without a config change.
 */

export type BookingSummary = {
  eventId: string;
  token: string;
  name: string;
  email: string;
  company?: string;
  topicLabel: string;
  message?: string;
  slot: Slot;
  visitorTimeZone: string;
  origin: string;
};

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#0b0b0c;color:#fafafa;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:500">${escapeHtml(label)}</a>`;

function times(summary: BookingSummary) {
  const { timeZone, timeZoneLabel } = bookingConfig;
  const theirs = formatRangeInZone(
    summary.slot.start,
    summary.slot.end,
    summary.visitorTimeZone,
    zoneAbbreviation(summary.slot.start, summary.visitorTimeZone),
  );
  const ours = formatRangeInZone(summary.slot.start, summary.slot.end, timeZone, timeZoneLabel);
  return { theirs, ours };
}

function confirmUrl(summary: BookingSummary) {
  return `${summary.origin}/api/booking/confirm?ref=${encodeURIComponent(summary.eventId)}&token=${encodeURIComponent(summary.token)}`;
}

function cancelUrl(summary: BookingSummary) {
  return `${summary.origin}/api/booking/cancel?ref=${encodeURIComponent(summary.eventId)}&token=${encodeURIComponent(summary.token)}`;
}

/**
 * Sent the moment a slot is held. The slot is already greyed out for everyone
 * else, but it is only theirs once they click — which is what stops a public
 * form being used to burn the whole calendar.
 */
export async function sendHoldEmail(summary: BookingSummary) {
  const { theirs, ours } = times(summary);
  const url = confirmUrl(summary);

  const html = emailLayout('One click to confirm your meeting', [
    `<p style="margin:0 0 20px">We are holding this time for you for the next ${bookingConfig.holdMinutes} minutes:</p>`,
    detailRows([
      ['Your time', theirs],
      ['Our time', ours],
      ['Topic', summary.topicLabel],
      ['Length', bookingConfig.durationLabel],
    ]),
    `<p style="margin:24px 0">${button(url, 'Confirm this meeting')}</p>`,
    `<p style="margin:0 0 8px;font-size:14px;color:#666970">If the button does not work, paste this into your browser:<br><span style="word-break:break-all">${escapeHtml(url)}</span></p>`,
    `<p style="margin:16px 0 0;font-size:14px;color:#666970">If you did not request this, ignore this email — the time reopens automatically.</p>`,
  ].join(''));

  const text = [
    `We are holding this time for you for the next ${bookingConfig.holdMinutes} minutes.`,
    ``,
    `Your time: ${theirs}`,
    `Our time:  ${ours}`,
    `Topic:     ${summary.topicLabel}`,
    ``,
    `Confirm the meeting:`,
    url,
    ``,
    `If you did not request this, ignore this email — the time reopens automatically.`,
  ].join('\n');

  return sendMail({
    to: summary.email,
    subject: `Confirm your meeting — ${formatDateTimeInZone(summary.slot.start, summary.visitorTimeZone)}`,
    html,
    text,
    replyTo: ownerEmail(),
  });
}

/** Sent once the booking is locked in, with a calendar file attached. */
export async function sendConfirmedEmail(summary: BookingSummary) {
  const { theirs, ours } = times(summary);
  const cancel = cancelUrl(summary);

  const ics = buildIcs({
    uid: summary.eventId,
    start: summary.slot.start,
    end: summary.slot.end,
    summary: `${site.name} — ${summary.topicLabel}`,
    description: `Meeting with ${site.name}.\n\nTopic: ${summary.topicLabel}\n\nNeed to change it? ${cancel}`,
    organiserEmail: ownerEmail(),
    attendeeEmail: summary.email,
    attendeeName: summary.name,
  });

  const html = emailLayout('Your meeting is confirmed', [
    `<p style="margin:0 0 20px">Confirmed — we have it in the diary. The attached file adds it to your calendar in one click.</p>`,
    detailRows([
      ['Your time', theirs],
      ['Our time', ours],
      ['Topic', summary.topicLabel],
      ['Length', bookingConfig.durationLabel],
    ]),
    `<p style="margin:24px 0 0;font-size:14px;color:#666970">Need to cancel? <a href="${cancel}" style="color:#0b0b0c">Release this time</a>. If something urgent comes up, call ${escapeHtml(site.contact.phoneDisplay)}.</p>`,
  ].join(''));

  const text = [
    `Your meeting is confirmed.`,
    ``,
    `Your time: ${theirs}`,
    `Our time:  ${ours}`,
    `Topic:     ${summary.topicLabel}`,
    ``,
    `Need to cancel? ${cancel}`,
  ].join('\n');

  return sendMail({
    to: summary.email,
    subject: `Confirmed — ${formatDateTimeInZone(summary.slot.start, summary.visitorTimeZone)}`,
    html,
    text,
    replyTo: ownerEmail(),
    attachments: [{ filename: 'meeting.ics', content: ics }],
  });
}

/** Tells you a meeting landed, in your timezone, with reply-to set to them. */
export async function sendOwnerNotice(summary: BookingSummary, state: 'held' | 'confirmed' | 'cancelled') {
  const { theirs, ours } = times(summary);
  const heading =
    state === 'confirmed'
      ? 'Meeting confirmed'
      : state === 'cancelled'
        ? 'Meeting cancelled'
        : 'Meeting requested';

  const rows: [string, string][] = [
    ['When', ours],
    ['Their time', `${theirs} — ${summary.visitorTimeZone}`],
    ['Name', summary.name],
    ['Email', summary.email],
    ...((summary.company ? [['Company', summary.company]] : []) as [string, string][]),
    ['Topic', summary.topicLabel],
  ];

  const html = emailLayout(heading, [
    detailRows(rows),
    ...(summary.message
      ? [
          `<hr style="border:0;border-top:1px solid #e4e5e7;margin:20px 0">`,
          `<div style="white-space:pre-wrap">${escapeHtml(summary.message)}</div>`,
        ]
      : []),
    ...(state === 'held'
      ? [
          `<p style="margin:20px 0 0;font-size:14px;color:#666970">Held for ${bookingConfig.holdMinutes} minutes pending their email confirmation. The slot reopens automatically if they do not confirm.</p>`,
        ]
      : []),
  ].join(''));

  const text = [
    heading,
    ``,
    ...rows.map(([key, value]) => `${key}: ${value}`),
    ...(summary.message ? ['', summary.message] : []),
  ].join('\n');

  return sendMail({
    to: ownerEmail(),
    subject: `${heading} — ${ours} — ${summary.name}`,
    html,
    text,
    replyTo: summary.email,
  });
}
