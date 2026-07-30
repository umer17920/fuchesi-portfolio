import crypto from 'node:crypto';

/**
 * Service-account authentication for every Google API this site talks to.
 *
 * Extracted from lib/sheets.ts once Calendar needed the same machinery. Both
 * callers mint a JWT from the same key; only the OAuth scope differs, so the
 * scope is a parameter and tokens are cached per scope.
 *
 * Still zero dependencies: Node's crypto signs the assertion and fetch
 * exchanges it. Pulling in `googleapis` for this would add tens of megabytes to
 * a serverless bundle to replace forty lines.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const SCOPES = {
  sheets: 'https://www.googleapis.com/auth/spreadsheets',
  calendar: 'https://www.googleapis.com/auth/calendar',
} as const;

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

export type ServiceAccount = { email: string; privateKey: string };

/** null when the service account is not configured — callers degrade. */
export function serviceAccount(): ServiceAccount | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = resolvePrivateKey();
  if (!email || !privateKey) return null;
  return { email, privateKey };
}

// Access tokens last an hour. Cached per scope across warm invocations so we do
// not mint a JWT and round-trip to Google on every single request — the
// availability endpoint is called on every date change, so this matters.
const tokenCache = new Map<string, { value: string; expiresAt: number }>();

export async function getAccessToken(scope: string): Promise<string> {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const account = serviceAccount();
  if (!account) throw new Error('Google service account is not configured.');

  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: account.email,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;

  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(account.privateKey, 'base64url');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(scope, {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });
  return json.access_token;
}
