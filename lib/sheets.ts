import { SCOPES, getAccessToken, serviceAccount } from './google/auth';

/**
 * Appends form submissions to a Google Sheet — the durable, ownable record of
 * every message and meeting request.
 *
 * Why a Sheet: the site is deployed to serverless functions (Vercel/Netlify),
 * whose filesystem is wiped after every request, so a local CSV file cannot
 * persist there. A Google Sheet survives, is owned by the client, updates live,
 * and downloads as a real CSV in two clicks — the "local CSV" intent, made to
 * actually work on free hosting.
 *
 * Configuration (all optional — unset means "not wired up yet", and callers
 * degrade gracefully). The service-account credentials themselves live in
 * lib/google/auth.ts, shared with Calendar:
 *   GOOGLE_SHEET_ID    the target spreadsheet id (from its URL)
 *   GOOGLE_SHEET_TAB   tab name, default "Submissions"
 */

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Column order. Columns A–H are the original layout and MUST NOT be reordered —
 * existing rows in live sheets are already written against them. Booking added
 * I–L by extending to the right, which leaves historic rows untouched.
 */
export const SHEET_COLUMNS = [
  'Timestamp',
  'Type',
  'Name',
  'Email',
  'Company',
  'Service / Topic',
  'Preferred time', // Pakistan time — the meeting as it appears in YOUR day
  'Message',
  'Visitor time', // the same instant in the visitor's own timezone
  'Visitor timezone',
  'Status',
  'Booking ref',
] as const;

/** 1-based column positions of the fields we update after the fact. */
const STATUS_COLUMN = 'K';
const REF_COLUMN = 'L';

export type SubmissionStatus = 'Pending confirmation' | 'Confirmed' | 'Cancelled' | 'Received';

export type SubmissionRow = {
  type: 'message' | 'meeting';
  name: string;
  email: string;
  company?: string;
  interest?: string;
  /** Meeting time rendered in the business timezone. */
  preferredTime?: string;
  message: string;
  /** The same meeting rendered in the visitor's timezone. */
  visitorTime?: string;
  visitorTimeZone?: string;
  status?: SubmissionStatus;
  /** Calendar event id, so the row can be found again on confirm/cancel. */
  ref?: string;
};

function config() {
  const account = serviceAccount();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB ?? 'Submissions';
  if (!account || !sheetId) return null;
  return { sheetId, tab };
}

export const isSheetConfigured = () => config() !== null;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken(SCOPES.sheets);
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * Appends one submission as a row. Never throws — returns a result the caller
 * can fold into its own success logic, because a Sheets outage must not lose an
 * enquiry that also went out by email.
 */
export async function appendSubmission(
  row: SubmissionRow,
): Promise<{ ok: boolean; reason?: 'notConfigured' | 'failed' }> {
  const cfg = config();
  if (!cfg) return { ok: false, reason: 'notConfigured' };

  try {
    const values = [
      [
        new Date().toISOString(),
        row.type,
        row.name,
        row.email,
        row.company ?? '',
        row.interest ?? '',
        row.preferredTime ?? '',
        row.message,
        row.visitorTime ?? '',
        row.visitorTimeZone ?? '',
        row.status ?? 'Received',
        row.ref ?? '',
      ],
    ];

    // USER_ENTERED so the timestamp lands as a real date; INSERT_ROWS appends
    // after the last row of the table rather than overwriting.
    const url =
      `${SHEETS_API}/${cfg.sheetId}` +
      `/values/${encodeURIComponent(cfg.tab)}!A1:append` +
      `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(url, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ values }),
    });

    if (!res.ok) {
      console.error('Sheets append failed:', res.status, await res.text());
      return { ok: false, reason: 'failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Sheets append threw:', err);
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Flips a row's Status once the visitor confirms or cancels.
 *
 * Finds the row by its booking ref rather than remembering a row number: rows
 * can be sorted or deleted in the sheet by hand, and a stale index would
 * silently rewrite somebody else's booking.
 */
export async function updateSubmissionStatus(
  ref: string,
  status: SubmissionStatus,
): Promise<boolean> {
  const cfg = config();
  if (!cfg || !ref) return false;

  try {
    const headers = await authHeaders();
    const lookupUrl =
      `${SHEETS_API}/${cfg.sheetId}` +
      `/values/${encodeURIComponent(`${cfg.tab}!${REF_COLUMN}1:${REF_COLUMN}`)}`;

    const lookup = await fetch(lookupUrl, { headers, cache: 'no-store' });
    if (!lookup.ok) {
      console.error('Sheets ref lookup failed:', lookup.status, await lookup.text());
      return false;
    }

    const { values } = (await lookup.json()) as { values?: string[][] };
    const rowIndex = (values ?? []).findIndex((cells) => cells[0]?.trim() === ref);
    if (rowIndex === -1) return false;

    const rowNumber = rowIndex + 1; // sheet rows are 1-based and include the header
    const updateUrl =
      `${SHEETS_API}/${cfg.sheetId}` +
      `/values/${encodeURIComponent(`${cfg.tab}!${STATUS_COLUMN}${rowNumber}`)}` +
      `?valueInputOption=USER_ENTERED`;

    const res = await fetch(updateUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ values: [[status]] }),
    });

    if (!res.ok) {
      console.error('Sheets status update failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Sheets status update threw:', err);
    return false;
  }
}
