import crypto from 'node:crypto';

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
 * Zero new dependencies. Rather than pull in the heavyweight `googleapis`
 * package, this mints a service-account JWT with Node's built-in crypto,
 * exchanges it for an access token, and calls the Sheets REST API with fetch.
 * Keeps the bundle lean.
 *
 * Configuration (all optional — unset means "not wired up yet", and callers
 * degrade gracefully):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  the service account's client_email
 *   GOOGLE_PRIVATE_KEY_BASE64     RECOMMENDED. The PEM private_key, base64-
 *                                 encoded — one clean single-line string with
 *                                 no newlines or quotes to be mangled by a
 *                                 hosting provider's env-var UI. This is the
 *                                 robust way to carry the key to Netlify/Vercel.
 *   GOOGLE_PRIVATE_KEY            Fallback. The raw PEM with escaped \n. Works,
 *                                 but the newline/quote handling is fragile
 *                                 across env-var UIs — prefer the base64 form.
 *   GOOGLE_SHEET_ID               the target spreadsheet id (from its URL)
 *   GOOGLE_SHEET_TAB             tab name, default "Submissions"
 */

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Column order. Keep in sync with the header row in setup docs. */
export const SHEET_COLUMNS = [
  'Timestamp',
  'Type',
  'Name',
  'Email',
  'Company',
  'Service / Topic',
  'Preferred time',
  'Message',
] as const;

export type SubmissionRow = {
  type: 'message' | 'meeting';
  name: string;
  email: string;
  company?: string;
  interest?: string;
  preferredTime?: string;
  message: string;
};

/**
 * Resolves the PEM private key from either env form.
 *
 * base64 is preferred and checked first: it is a single line with no newlines
 * or quotes, so it survives any hosting provider's env-var field untouched —
 * eliminating the single most common cause of a working key failing once
 * deployed. The raw \n form is kept as a fallback.
 */
function resolvePrivateKey(): string | null {
  const b64 = process.env.GOOGLE_PRIVATE_KEY_BASE64;
  if (b64) return Buffer.from(b64, 'base64').toString('utf8');
  const raw = process.env.GOOGLE_PRIVATE_KEY;
  if (raw) return raw.replace(/\\n/g, '\n'); // env stores often escape newlines
  return null;
}

function config() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = resolvePrivateKey();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB ?? 'Submissions';
  if (!email || !privateKey || !sheetId) return null;
  return { email, privateKey, sheetId, tab };
}

export const isSheetConfigured = () => config() !== null;

// Access tokens last an hour. Cache across warm invocations so we do not mint a
// JWT and round-trip to Google on every single submission.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;

  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKey, 'base64url');
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
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
    const token = await getAccessToken(cfg.email, cfg.privateKey);
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
      ],
    ];

    // USER_ENTERED so the timestamp lands as a real date; INSERT_ROWS appends
    // after the last row of the table rather than overwriting.
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}` +
      `/values/${encodeURIComponent(cfg.tab)}!A1:append` +
      `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
