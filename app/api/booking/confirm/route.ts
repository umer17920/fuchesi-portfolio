import { NextResponse } from 'next/server';
import { PROP } from '@/lib/booking/calendar';
import { bookingConfig } from '@/lib/booking/config';
import { sendConfirmedEmail, sendOwnerNotice } from '@/lib/booking/emails';
import { confirmBooking, resolveBooking } from '@/lib/booking/holds';
import { findSlotByStart } from '@/lib/booking/slots';
import { updateSubmissionStatus } from '@/lib/sheets';

/**
 * The confirmation link from the hold email.
 *
 * Turning a hold into a booking requires proving you received the email, which
 * is what keeps a public form from being used to block out the calendar with
 * addresses nobody owns.
 *
 * Always redirects to a human-readable page rather than returning JSON — this
 * URL is opened by a person in a mail client, not by code.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function origin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function GET(request: Request) {
  const base = origin(request);
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref') ?? '';
  const token = searchParams.get('token') ?? '';

  const to = (status: string) => NextResponse.redirect(new URL(`/meeting?status=${status}`, base));

  if (!ref || !token) return to('invalid');

  try {
    const resolved = await resolveBooking(ref, token);
    if (resolved.status === 'invalid') return to('invalid');
    if (resolved.status === 'expired') return to('expired');
    if (resolved.status === 'alreadyCancelled') return to('cancelled');

    const event = resolved.event;
    const props = event.extendedProperties?.private ?? {};

    // Already confirmed — clicking the link twice must not look like a failure.
    if (props[PROP.state] === 'confirmed') return to('confirmed');

    const slot = findSlotByStart(event.start?.dateTime ?? '');
    if (!slot) return to('invalid');

    if (!(await confirmBooking(event))) return to('error');

    await updateSubmissionStatus(ref, 'Confirmed');

    const summary = {
      eventId: ref,
      token,
      name: props[PROP.visitorName] ?? 'Guest',
      email: props[PROP.visitorEmail] ?? '',
      topicLabel: props[PROP.topic] ?? 'Meeting',
      slot,
      visitorTimeZone: props[PROP.visitorTz] ?? bookingConfig.timeZone,
      origin: base,
    };

    if (summary.email) await sendConfirmedEmail(summary);
    await sendOwnerNotice(summary, 'confirmed');

    return to('confirmed');
  } catch (err) {
    console.error('Booking confirmation failed:', err);
    return to('error');
  }
}
