import { NextResponse } from 'next/server';
import { bookingSchema, serviceOptions } from '@/lib/contact-schema';
import { capture, getClientIp, rateLimited } from '@/lib/submission';
import { isCalendarConfigured } from '@/lib/booking/calendar';
import { bookingConfig } from '@/lib/booking/config';
import { sendConfirmedEmail, sendHoldEmail } from '@/lib/booking/emails';
import {
  availabilityForDate,
  claimSlot,
  hashToken,
  newConfirmationToken,
} from '@/lib/booking/holds';
import { findSlotByStart, isWithinWindow } from '@/lib/booking/slots';
import {
  formatRangeInZone,
  isValidTimeZone,
  isoDateInZone,
  zoneAbbreviation,
} from '@/lib/booking/time';
import { isEmailConfigured } from '@/lib/email';

/**
 * Meeting booking.
 *
 * Unlike the message form, this one CLAIMS something: the chosen slot is locked
 * on the calendar before we reply, so it greys out for everyone else. The claim
 * is atomic (see claimSlot), which is what makes the greyed-out grid honest
 * rather than merely optimistic.
 *
 * A losing race returns 409 together with fresh availability, so the form can
 * repaint the grid instead of showing an error — the user sees the board
 * update, not a failure.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function requestOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (rateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: 'Too many requests from this connection. Please try again in a minute.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? '']),
    );
    return NextResponse.json({ error: 'Some fields need fixing.', fieldErrors }, { status: 400 });
  }

  const { name, email, company, slotStart, visitorTimeZone, topic, message, website } = parsed.data;

  // Honeypot tripped: accept silently so the bot does not learn it was caught.
  // Nothing is claimed, so a bot cannot burn the calendar this way either.
  if (website) return NextResponse.json({ ok: true });

  // The slot must be one we actually generated — not merely a parseable date.
  const slot = findSlotByStart(slotStart);
  if (!slot || !isWithinWindow(slot)) {
    return NextResponse.json(
      { error: 'Some fields need fixing.', fieldErrors: { slotStart: 'Pick a time that is still available.' } },
      { status: 400 },
    );
  }

  const visitorZone = isValidTimeZone(visitorTimeZone) ? visitorTimeZone : bookingConfig.timeZone;
  const topicLabel = serviceOptions.find((option) => option.value === topic)?.label ?? topic;
  const ourTime = formatRangeInZone(slot.start, slot.end, bookingConfig.timeZone, bookingConfig.timeZoneLabel);
  const theirTime = formatRangeInZone(
    slot.start,
    slot.end,
    visitorZone,
    zoneAbbreviation(slot.start, visitorZone),
  );

  const requiresConfirmation = isEmailConfigured();
  const token = newConfirmationToken();
  let eventId: string | undefined;

  if (isCalendarConfigured()) {
    const claim = await claimSlot(slot, {
      name,
      email,
      company: company || undefined,
      topicLabel,
      message: message || undefined,
      visitorTimeZone: visitorZone,
      requiresConfirmation,
      tokenHash: hashToken(token),
    });

    if (claim.status === 'taken') {
      // Somebody won the race. Hand back the repainted board rather than an
      // error the visitor has to interpret.
      const slots = await availabilityForDate(isoDateInZone(slot.start, bookingConfig.timeZone)).catch(
        () => [],
      );
      return NextResponse.json(
        { error: 'slotTaken', date: isoDateInZone(slot.start, bookingConfig.timeZone), slots },
        { status: 409 },
      );
    }

    if (claim.status === 'error') {
      return NextResponse.json({ error: 'sendFailed' }, { status: 502 });
    }

    eventId = claim.eventId;
  }

  const result = await capture(
    {
      type: 'meeting',
      name,
      email,
      company: company || undefined,
      interest: topicLabel,
      preferredTime: ourTime,
      visitorTime: theirTime,
      visitorTimeZone: visitorZone,
      status: !eventId ? 'Received' : requiresConfirmation ? 'Pending confirmation' : 'Confirmed',
      ref: eventId,
      message: message || '',
    },
    {
      subject: `Meeting ${requiresConfirmation && eventId ? 'held' : 'booked'} — ${ourTime} — ${name}`,
      replyTo: email,
      rows: [
        ['When', ourTime],
        ['Their time', `${theirTime} — ${visitorZone}`],
        ['Name', name],
        ['Email', email],
        ...((company ? [['Company', company]] : []) as [string, string][]),
        ['Topic', topicLabel],
      ],
      body: message || undefined,
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error === 'notConfigured' ? 'notConfigured' : 'sendFailed' },
      { status: result.status },
    );
  }

  // Tell the visitor. With email configured this is the confirmation link that
  // turns their hold into a real booking; without it, there is nothing to
  // confirm and the slot was taken outright.
  if (eventId) {
    const summary = {
      eventId,
      token,
      name,
      email,
      company: company || undefined,
      topicLabel,
      message: message || undefined,
      slot,
      visitorTimeZone: visitorZone,
      origin: requestOrigin(request),
    };
    if (requiresConfirmation) await sendHoldEmail(summary);
    else await sendConfirmedEmail(summary);
  }

  return NextResponse.json({
    ok: true,
    requiresConfirmation: Boolean(eventId) && requiresConfirmation,
    booked: Boolean(eventId),
    yourTime: theirTime,
    ourTime,
  });
}
