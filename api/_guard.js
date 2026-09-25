// The gate on the admin endpoints.
//
// /api/enquiries and /api/stats return customers' names, addresses and the
// messages they wrote. The only thing in front of them is ADMIN_SECRET, so the
// two ways that secret gets broken are worth closing: guessing it quickly, and
// learning it a character at a time from how long the comparison takes.

import { timingSafeEqual } from 'node:crypto';

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

// One process's memory — and that is a real limit, not a formality to wave at.
//
// Measured: 70 rapid guesses through `vercel dev` all returned 403 and never
// 429, because each invocation there gets a fresh process and the counter with
// it. In production a warm instance holds state between requests, so a burst
// down one instance is caught; a burst spread across cold starts is not.
//
// So this narrows the window rather than closing it, and the thing actually
// protecting these endpoints is the secret being long and rotatable. If that
// ever stops being enough, the fix is a shared counter in the store, not a
// bigger number here.
const seen = [];

export function tooMany(key, limit = 60, windowMs = 60000) {
  const now = Date.now();
  while (seen.length && now - seen[0].t > windowMs) seen.shift();
  const mine = seen.filter((r) => r.k === key).length;
  seen.push({ k: key, t: now });
  return mine >= limit;
}

/**
 * Compare two secrets without leaking their contents through timing.
 *
 * `a !== b` returns as soon as it finds a differing byte, so the time it takes
 * tracks how many leading characters were right. That is enough to recover a
 * secret one character at a time. Lengths are compared first because
 * timingSafeEqual throws on a mismatch — the length is not the secret.
 */
export function secretMatches(provided, expected) {
  if (!expected) return false;              // unset means closed, never open
  const a = Buffer.from(String(provided ?? ''), 'utf8');
  const b = Buffer.from(String(expected), 'utf8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function callerKey(req) {
  const fwd = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(fwd) ? fwd[0] : String(fwd || '').split(',')[0].trim();
  return ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Everything the admin endpoints check before they answer. Returns null when
 * the request may proceed, or the response to send.
 *
 * Rate limiting runs BEFORE the secret is compared: checking afterwards would
 * let an attacker spend the whole window guessing.
 */
export function adminGuard(req, { limit = 60, windowMs = 60000 } = {}) {
  if (tooMany(callerKey(req), limit, windowMs)) {
    return { status: 429, body: { ok: false, error: 'Too many requests. Try again shortly.' } };
  }
  if (!secretMatches(clean(req.query?.s), process.env.ADMIN_SECRET)) {
    return { status: 403, body: { ok: false, error: 'Forbidden' } };
  }
  return null;
}
