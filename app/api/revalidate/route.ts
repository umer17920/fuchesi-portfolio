import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { parseBody } from 'next-sanity/webhook';

/**
 * Sanity → Next revalidation webhook.
 *
 * Publishing in the studio rebuilds only the affected pages, which is what lets
 * every marketing page stay statically generated (and CDN-served, with no
 * origin dependency) while still being editable by non-developers.
 *
 * TODO: you need to add this before publishing updates the live site:
 *
 *   SANITY_REVALIDATE_SECRET — any long random string.
 *
 * Set the same value in sanity.io/manage → API → Webhooks, pointing at
 * https://<your-domain>/api/revalidate with the secret configured. The
 * signature is verified below, so an unsigned request cannot force rebuilds.
 */
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    console.error('SANITY_REVALIDATE_SECRET is not set — refusing to revalidate.');
    return NextResponse.json({ error: 'notConfigured' }, { status: 503 });
  }

  try {
    const { isValidSignature, body } = await parseBody<{ _type: string; slug?: { current: string } }>(
      request,
      secret,
    );

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    if (!body?._type) {
      return NextResponse.json({ error: 'Missing _type' }, { status: 400 });
    }

    // Next 16 requires a cache-life profile. 'max' is what Next's own
    // deprecation notice directs route handlers to use — updateTag() is the
    // immediate-expiry alternative but throws outside a Server Action.
    revalidateTag(body._type, 'max');
    if (body.slug?.current) revalidateTag(`${body._type}:${body.slug.current}`, 'max');

    return NextResponse.json({ revalidated: true, type: body._type });
  } catch (err) {
    console.error('Revalidation webhook failed:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
