import { appendSubmission, isSheetConfigured, type SubmissionRow } from './sheets';
import { detailRows, emailLayout, escapeHtml, isEmailConfigured, ownerEmail, sendMail } from './email';

/**
 * Shared plumbing for the two form endpoints (contact + booking).
 *
 * A submission is considered captured if it landed in EITHER the Google Sheet
 * OR an email — so a client who wires up only the Sheet (no Resend) still has a
 * fully working, durable form. It only fails if nothing is configured, or if
 * everything that is configured errored. Losing a real enquiry to a fake
 * success message is the worst outcome here, so the success bar is "recorded
 * somewhere we can retrieve it", not "all channels succeeded".
 */

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

const RATE_LIMIT = { windowMs: 60_000, max: 5 };
const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Coarse in-memory rate limit, shared across both endpoints. Per-instance and
 * resets on cold start, so it is a speed bump against casual abuse, not a real
 * control. If seriously targeted, move to Upstash or Vercel KV.
 */
export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

type EmailContent = { subject: string; rows: [string, string][]; body?: string; replyTo: string };

async function sendEnquiry(content: EmailContent) {
  const html = emailLayout(content.subject, [
    detailRows(content.rows),
    ...(content.body
      ? [
          `<hr style="border:0;border-top:1px solid #e4e5e7;margin:20px 0">`,
          `<div style="white-space:pre-wrap">${escapeHtml(content.body)}</div>`,
        ]
      : []),
  ].join(''));

  const text = [
    ...content.rows.map(([key, value]) => `${key}: ${value}`),
    ...(content.body ? ['', content.body] : []),
  ].join('\n');

  return sendMail({
    to: ownerEmail(),
    subject: content.subject,
    html,
    text,
    replyTo: content.replyTo,
  });
}

export type CaptureResult =
  | { ok: true }
  | { ok: false; status: 503 | 502; error: 'notConfigured' | 'deliveryFailed' };

/**
 * Records a submission to every configured channel (Sheet + email) in parallel
 * and decides overall success.
 */
export async function capture(row: SubmissionRow, email: EmailContent): Promise<CaptureResult> {
  const sheetConfigured = isSheetConfigured();
  const emailPossible = isEmailConfigured();

  if (!sheetConfigured && !emailPossible) {
    console.error('Submission NOT stored: neither Google Sheet nor Resend is configured.', {
      type: row.type,
      email: row.email,
    });
    return { ok: false, status: 503, error: 'notConfigured' };
  }

  const [sheet, mail] = await Promise.all([
    sheetConfigured ? appendSubmission(row) : Promise.resolve({ ok: false as const }),
    emailPossible ? sendEnquiry(email) : Promise.resolve({ configured: false, ok: false }),
  ]);

  // Captured if it reached anywhere retrievable.
  if (sheet.ok || mail.ok) return { ok: true };

  // Everything that was configured failed.
  console.error('Submission NOT stored: all configured channels failed.', {
    type: row.type,
    email: row.email,
    sheetOk: sheet.ok,
    mailOk: mail.ok,
  });
  return { ok: false, status: 502, error: 'deliveryFailed' };
}
