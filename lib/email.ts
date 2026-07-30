import { Resend } from 'resend';
import { site } from './site';

/**
 * One place that talks to Resend.
 *
 * Extracted from lib/submission.ts once booking confirmations needed to send
 * mail with an attachment. Everything that emails goes through here, so the
 * "is email even configured?" question is answered identically everywhere.
 */

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_FROM);

export const ownerEmail = () => process.env.CONTACT_TO ?? site.contact.email;

export type Attachment = { filename: string; content: string };

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Attachment[];
};

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string,
  );

/**
 * Sends one message. Never throws — callers fold the result into their own
 * success logic, because a mail outage must not lose an enquiry that was also
 * written to the sheet.
 */
export async function sendMail(input: MailInput): Promise<{ configured: boolean; ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  if (!apiKey || !from) return { configured: false, ok: false };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content).toString('base64'),
      })),
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

/** Shared shell so every message from the site looks like the site. */
export function emailLayout(heading: string, bodyHtml: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.65;color:#0b0b0c;max-width:560px">
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.12em;margin:0 0 24px">FUCHESİ</p>
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;margin:0 0 16px">${escapeHtml(heading)}</h1>
      ${bodyHtml}
      <hr style="border:0;border-top:1px solid #e4e5e7;margin:28px 0 16px">
      <p style="font-size:13px;color:#666970;margin:0">
        ${escapeHtml(site.name)} · <a href="${site.url}" style="color:#666970">${site.url.replace('https://', '')}</a>
      </p>
    </div>
  `;
}

/** Key/value block used by the enquiry notifications. */
export function detailRows(rows: [string, string][]): string {
  return `<table style="font-size:15px;line-height:1.6;border-collapse:collapse">${rows
    .map(
      ([key, value]) =>
        `<tr><td style="padding:2px 16px 2px 0;color:#666970;vertical-align:top">${escapeHtml(key)}</td><td style="padding:2px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>`;
}
