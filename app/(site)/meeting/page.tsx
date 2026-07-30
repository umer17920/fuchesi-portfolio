import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/primitives/Container';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { site } from '@/lib/site';

/**
 * Where the confirm and cancel links from booking emails land.
 *
 * Deliberately not indexed: it is a transactional destination reached from an
 * email, has no standalone value in search, and its query string describes one
 * person's booking.
 */
export const metadata: Metadata = {
  title: 'Your meeting',
  robots: { index: false, follow: false },
};

type Outcome = {
  heading: string;
  body: string;
  tone: 'good' | 'neutral';
};

const OUTCOMES: Record<string, Outcome> = {
  confirmed: {
    heading: 'Confirmed.',
    body: 'Your meeting is locked in and we have sent a calendar invite to your inbox. If anything changes, the cancellation link in that email frees the time immediately.',
    tone: 'good',
  },
  cancelled: {
    heading: 'That time is released.',
    body: 'The slot is back on the calendar for someone else. No hard feelings — book another whenever it suits you.',
    tone: 'neutral',
  },
  expired: {
    heading: 'That hold expired.',
    body: 'We only hold a time for a short window before releasing it, and this one has gone back into the pool. It may well still be free — pick it again and it is yours.',
    tone: 'neutral',
  },
  invalid: {
    heading: 'That link did not work.',
    body: 'It may have been mistyped, or the booking it points at no longer exists. Booking again takes a moment.',
    tone: 'neutral',
  },
  error: {
    heading: 'Something went wrong at our end.',
    body: 'That is our fault, not yours. Try the link once more, and if it still fails, email us and we will sort it out by hand.',
    tone: 'neutral',
  },
};

export default async function MeetingStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const outcome = OUTCOMES[status ?? ''] ?? OUTCOMES.invalid;

  return (
    <section className="pb-section pt-16 sm:pt-20">
      <Container>
        <div className="max-w-[62ch]">
          <Eyebrow>{outcome.tone === 'good' ? 'Meeting confirmed' : 'Meeting'}</Eyebrow>
          <h1 className="mt-7 font-display text-display-l">{outcome.heading}</h1>
          <p className="mt-8 text-body-l text-ink-soft">{outcome.body}</p>

          <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-hairline pt-8">
            <Link
              href="/contact"
              className="border-b border-hairline pb-1 text-body-m transition-colors duration-300 hover:border-ink"
            >
              Book another time
            </Link>
            <a
              href={`mailto:${site.contact.email}`}
              className="border-b border-hairline pb-1 text-body-m text-muted transition-colors duration-300 hover:border-ink hover:text-ink"
            >
              {site.contact.email}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
