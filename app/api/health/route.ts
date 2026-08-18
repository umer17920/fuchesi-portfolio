import { NextResponse } from 'next/server';
import { isCalendarConfigured } from '@/lib/booking/calendar';
import { isEmailConfigured } from '@/lib/email';
import { isSheetConfigured } from '@/lib/sheets';
import { isSanityConfigured } from '@/lib/sanity/env';

/**
 * Which integrations the RUNNING function can actually see.
 *
 * Exists because "is this variable reaching production?" was, until now,
 * answerable only by submitting a real form and reading the side effects. That
 * cost hours on the Google Sheet (a correct key that no successful deploy ever
 * carried) and again on Resend, and it left test rows in the sheet and orphan
 * events on the calendar every time.
 *
 * Reports booleans, never values. Knowing that email is configured is not
 * sensitive; the key itself never appears here, and each flag is derived from
 * the same helper the real code paths use, so it cannot drift from reality.
 *
 * The individual `resendKey` / `contactFrom` flags are deliberate: `email`
 * requires both, so a single combined flag cannot tell you which half is
 * missing, which is exactly the question worth asking when it is false.
 */
export const runtime = 'nodejs';
// Must never be cached or prerendered: a cached snapshot of configuration state
// is worse than no diagnostic at all.
export const dynamic = 'force-dynamic';

export async function GET() {
  const body = {
    ok: true,
    integrations: {
      sheet: isSheetConfigured(),
      calendar: isCalendarConfigured(),
      email: isEmailConfigured(),
      sanity: isSanityConfigured,
    },
    // Which half of the email config is present, for when `email` is false.
    email: {
      resendKey: Boolean(process.env.RESEND_API_KEY),
      contactFrom: Boolean(process.env.CONTACT_FROM),
      contactTo: Boolean(process.env.CONTACT_TO),
    },
    // Lengths only. Enough to spot a truncated or whitespace-only paste without
    // disclosing anything about the value itself.
    lengths: {
      resendKey: (process.env.RESEND_API_KEY ?? '').trim().length,
      contactFrom: (process.env.CONTACT_FROM ?? '').trim().length,
      contactTo: (process.env.CONTACT_TO ?? '').trim().length,
      calendarId: (process.env.GOOGLE_CALENDAR_ID ?? '').trim().length,
    },
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
