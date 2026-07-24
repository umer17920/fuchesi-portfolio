import { NextResponse } from 'next/server';
import { bookingSchema, serviceOptions } from '@/lib/contact-schema';
import { capture, getClientIp, rateLimited } from '@/lib/submission';

/**
 * Meeting-request endpoint.
 *
 * Records a requested meeting (name, email, preferred date + time, topic) to
 * the same Google Sheet as messages, tagged type="meeting", and emails it.
 * This is a request, not a live calendar booking — it does not check
 * availability or block a calendar. Same capture/success rules as /api/contact.
 */
export const runtime = 'nodejs';

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

  const { name, email, company, preferredDate, preferredTime, topic, message, website } =
    parsed.data;

  if (website) return NextResponse.json({ ok: true });

  const topicLabel = serviceOptions.find((o) => o.value === topic)?.label ?? topic;
  const when = `${preferredDate} at ${preferredTime}`;

  const result = await capture(
    {
      type: 'meeting',
      name,
      email,
      company: company || undefined,
      interest: topicLabel,
      preferredTime: when,
      message: message || '',
    },
    {
      subject: `Meeting request — ${when} — ${name}`,
      replyTo: email,
      rows: [
        ['Name', name],
        ['Email', email],
        ...((company ? [['Company', company]] : []) as [string, string][]),
        ['Topic', topicLabel],
        ['Preferred time', when],
      ],
      body: message || undefined,
    },
  );

  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: result.error === 'notConfigured' ? 'notConfigured' : 'sendFailed' },
    { status: result.status },
  );
}
