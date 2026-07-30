import { NextResponse } from 'next/server';
import { PROP } from '@/lib/booking/calendar';
import { bookingConfig } from '@/lib/booking/config';
import { sendOwnerNotice } from '@/lib/booking/emails';
import { cancelBooking, resolveBooking } from '@/lib/booking/holds';
import { findSlotByStart } from '@/lib/booking/slots';
import { updateSubmissionStatus } from '@/lib/sheets';

/**
 * The cancellation link from the confirmation email.
 *
 * Cancelling releases the slot immediately — isBlocking() stops counting a
 * cancelled event, so the time reappears in the grid on the next availability
 * read. The event is kept (marked cancelled and transparent) rather than
 * deleted, because Google will not allow a deleted event id to be reused and
 * the id is derived from the slot: deleting would make that half hour
 * permanently unbookable.
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
    if (resolved.status === 'alreadyCancelled') return to('cancelled');
    // An expired hold has already released its slot; say so plainly.
    if (resolved.status === 'expired') return to('cancelled');

    const event = resolved.event;
    const props = event.extendedProperties?.private ?? {};

    if (!(await cancelBooking(event))) return to('error');

    await updateSubmissionStatus(ref, 'Cancelled');

    const slot = findSlotByStart(event.start?.dateTime ?? '');
    if (slot) {
      await sendOwnerNotice(
        {
          eventId: ref,
          token,
          name: props[PROP.visitorName] ?? 'Guest',
          email: props[PROP.visitorEmail] ?? '',
          topicLabel: props[PROP.topic] ?? 'Meeting',
          slot,
          visitorTimeZone: props[PROP.visitorTz] ?? bookingConfig.timeZone,
          origin: base,
        },
        'cancelled',
      );
    }

    return to('cancelled');
  } catch (err) {
    console.error('Booking cancellation failed:', err);
    return to('error');
  }
}
