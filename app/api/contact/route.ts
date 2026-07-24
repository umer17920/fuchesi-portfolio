import { NextResponse } from 'next/server';
import { contactSchema, serviceOptions } from '@/lib/contact-schema';
import { capture, getClientIp, rateLimited } from '@/lib/submission';

/**
 * Contact (message) endpoint.
 *
 * Records each message to a Google Sheet AND emails it — whichever channels are
 * configured (see lib/submission.ts). A submission succeeds if it lands in
 * either, so the form is fully functional with just the Sheet wired up, no
 * email required.
 *
 * Configuration lives in .env.example. Until at least one channel is set up,
 * this returns a clear 503 and the form tells the visitor to email directly,
 * rather than faking success and dropping a real lead.
 */
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (rateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: 'Too many messages from this connection. Please try again in a minute.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  // Re-validate server-side. The client check is a convenience, not a guarantee.
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? '']),
    );
    return NextResponse.json({ error: 'Some fields need fixing.', fieldErrors }, { status: 400 });
  }

  const { name, email, company, serviceInterest, message, website } = parsed.data;

  // Honeypot tripped: accept silently so the bot does not learn it was caught.
  if (website) return NextResponse.json({ ok: true });

  const serviceLabel =
    serviceOptions.find((o) => o.value === serviceInterest)?.label ?? serviceInterest;

  const result = await capture(
    {
      type: 'message',
      name,
      email,
      company: company || undefined,
      interest: serviceLabel,
      message,
    },
    {
      subject: `Enquiry — ${serviceLabel} — ${name}`,
      replyTo: email,
      rows: [
        ['Name', name],
        ['Email', email],
        ...((company ? [['Company', company]] : []) as [string, string][]),
        ['About', serviceLabel],
      ],
      body: message,
    },
  );

  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: result.error === 'notConfigured' ? 'notConfigured' : 'sendFailed' },
    { status: result.status },
  );
}
