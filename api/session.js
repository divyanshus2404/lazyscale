// Login and logout for the owner inbox.
//
// POST /api/session   { key: "<tenantKey>.<secret>" }  -> sets the session cookie
// DELETE /api/session                                   -> clears it (logout)
//
// The access key is what you hand a business at onboarding. The secret half is
// compared in constant time against the one stored on their tenant, so a wrong
// key leaks nothing about how wrong it was. Everything else lives in _session.js.

import { getTenant } from './_tenants.js';
import { makeSession, sessionCookie, safeEqual } from './_session.js';

// A small throttle so the key cannot be brute forced from one place. Not the
// real defence (the secret is 24 random bytes), just good manners.
const hits = [];
function tooMany(limit = 20, windowMs = 60000) {
  const now = Date.now();
  while (hits.length && now - hits[0] > windowMs) hits.shift();
  if (hits.length >= limit) return true;
  hits.push(now);
  return false;
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', sessionCookie('', { secure: !!process.env.VERCEL }));
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!process.env.SESSION_SECRET) {
    return res.status(503).json({ ok: false, error: 'Sign-in is not configured.' });
  }
  if (tooMany()) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Wait a minute.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  const raw = String(body.key || '').trim();
  const dot = raw.indexOf('.');
  if (dot < 1) return res.status(401).json({ ok: false, error: 'That key is not valid.' });

  const tenantKey = raw.slice(0, dot);
  const provided = raw.slice(dot + 1);

  const tenant = await getTenant(tenantKey);
  // No tenant, or no secret set on it, or a mismatch: all fail the same way, so
  // the response never reveals which tenants exist.
  if (!tenant?.accessToken || !safeEqual(provided, tenant.accessToken)) {
    return res.status(401).json({ ok: false, error: 'That key is not valid.' });
  }

  res.setHeader('Set-Cookie', sessionCookie(makeSession(tenantKey), { secure: !!process.env.VERCEL }));
  return res.status(200).json({ ok: true, tenant: tenantKey, name: tenant.resolved?.displayName || tenantKey });
}

function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
