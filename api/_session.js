// The auth wall, security core.
//
// A business logs in with one access key (`<tenantKey>.<secret>`) that you hand
// them at onboarding. On success this issues a signed session: an HMAC of a
// small payload, in an httpOnly cookie. Every leads request then carries the
// cookie, the signature is checked, and the request is scoped to that tenant.
//
// Honest about what this is and isn't:
//  - It IS legit: the cookie is signed with a server secret the browser never
//    sees, verified in constant time, expires, and fails closed if the secret is
//    missing. A forged or tampered cookie is rejected. httpOnly keeps it out of
//    reach of page scripts.
//  - It is a shared secret PER TENANT, not per user. Good enough for a handful
//    of pilot businesses, where one owner holds the key. The upgrade, when you
//    have multiple staff per business, is magic-link email or per-user accounts.
//    The scoping (every query filtered by the session's tenant) does not change
//    when you upgrade, so this is not a throwaway.
//
// Environment: SESSION_SECRET (required; no secret, nobody gets in).

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export const COOKIE = 'ls_session';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const secret = () => process.env.SESSION_SECRET || '';

function sign(payloadB64) {
  return b64url(createHmac('sha256', secret()).update(payloadB64).digest());
}

// Constant-time string compare that never throws and is false on any length
// mismatch. Used for both the cookie signature and the tenant secret.
export function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  try { return timingSafeEqual(ab, bb); } catch { return false; }
}

/** A fresh random tenant secret, for onboarding a business. */
export function newTenantSecret() {
  return randomBytes(24).toString('base64url');
}

/** Make a signed session value for a tenant. Empty string if no server secret. */
export function makeSession(tenantKey, ttlMs = DEFAULT_TTL_MS) {
  if (!secret() || !tenantKey) return '';
  const payload = b64url(JSON.stringify({ t: tenantKey, exp: Date.now() + ttlMs }));
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify a session value. Returns { tenantKey } when the signature checks out
 * and it has not expired, otherwise null. Never throws.
 */
export function readSession(value) {
  if (!secret() || !value || typeof value !== 'string') return null;
  const dot = value.indexOf('.');
  if (dot < 1) return null;
  const payloadB64 = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!safeEqual(sig, sign(payloadB64))) return null;      // forged or tampered
  try {
    const { t, exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!t || !exp || Date.now() > exp) return null;       // missing or expired
    return { tenantKey: t };
  } catch { return null; }
}

/** Parse a Cookie header into a plain object. */
export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** The Set-Cookie string for a session. `value` empty clears it (logout). */
export function sessionCookie(value, { ttlMs = DEFAULT_TTL_MS, secure = true } = {}) {
  const parts = [
    `${COOKIE}=${value}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    value ? `Max-Age=${Math.floor(ttlMs / 1000)}` : 'Max-Age=0'
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** The tenant for a request, or null. The one gate every leads route calls. */
export function sessionTenant(req) {
  const cookies = parseCookies(req.headers?.cookie || req.headers?.Cookie);
  return readSession(cookies[COOKIE]);
}
