import { Resend } from 'resend';
import { appendSubmission, isSheetConfigured, type SubmissionRow } from './sheets';
import { site } from './site';

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

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

type EmailContent = { subject: string; rows: [string, string][]; body?: string; replyTo: string };

async function sendEmail(content: EmailContent): Promise<{ configured: boolean; ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = process.env.CONTACT_TO ?? site.contact.email;
  if (!apiKey || !from) return { configured: false, ok: false };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: content.replyTo,
      subject: content.subject,
      text: [
        ...content.rows.map(([k, v]) => `${k}: ${v}`),
        ...(content.body ? ['', content.body] : []),
      ].join('\n'),
      html: `
        <table style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6">
          ${content.rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:2px 12px 2px 0;color:#666">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
            )
            .join('')}
        </table>
        ${
          content.body
            ? `<hr style="border:0;border-top:1px solid #e4e5e7;margin:16px 0"><div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap">${escapeHtml(content.body)}</div>`
            : ''
        }
      `,
    });
    if (error) {
      console.error('Resend rejected the message:', error);
      return { configured: true, ok: false };
    }
    return { configured: true, ok: true };
  } catch (err) {
    console.error('Email send threw:', err);
    return { configured: true, ok: false };
  }
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
  const emailPossible = Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_FROM);

  if (!sheetConfigured && !emailPossible) {
    console.error('Submission NOT stored: neither Google Sheet nor Resend is configured.', {
      type: row.type,
      email: row.email,
    });
    return { ok: false, status: 503, error: 'notConfigured' };
  }

  const [sheet, mail] = await Promise.all([
    sheetConfigured ? appendSubmission(row) : Promise.resolve({ ok: false as const }),
    emailPossible ? sendEmail(email) : Promise.resolve({ configured: false, ok: false }),
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
