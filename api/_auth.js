// Verifying a Supabase Auth session, server side.
//
// The browser signs in with Supabase (Google, Apple, GitHub or an email magic
// link) and gets an access token. It sends that token to our API as
// `Authorization: Bearer <token>`. We do not trust it on its face: we hand it
// back to Supabase's own /auth/v1/user endpoint, which only returns a user if
// the token is genuine and unexpired. No token forging gets past that, and we
// never need the JWT secret in our code.
//
// Then tenantKeyForEmail turns that identity into "whose leads may they see".
//
// Environment: SUPABASE_URL, SUPABASE_ANON_KEY.

import { tenantKeyForEmail } from './_tenants.js';

/** Validate a Supabase access token and return { email, id }, or null. */
export async function verifyBearer(token) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url.replace(/\/+$/, '') + '/auth/v1/user', {
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, apikey: anon }
    });
    if (!res.ok) return null;
    const u = await res.json().catch(() => null);
    return u?.email ? { email: String(u.email).toLowerCase(), id: u.id } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The tenant for a request, whichever way it authenticated. A Supabase bearer
 * token wins (the new, social path); a signed access-key cookie is the fallback
 * that keeps working while providers are being set up. Returns a tenant key or
 * null. `bearerVerifier` and `cookieReader` are injectable for tests.
 */
export async function requestTenant(req, deps = {}) {
  const verify = deps.verifyBearer || verifyBearer;
  const bearer = String(req.headers?.authorization || req.headers?.Authorization || '')
    .replace(/^Bearer\s+/i, '').trim();

  if (bearer) {
    const user = await verify(bearer);
    if (user) {
      const key = await (deps.tenantKeyForEmail || tenantKeyForEmail)(user.email);
      if (key) return { tenantKey: key, via: 'supabase', email: user.email };
      // Signed in, but their email is not linked to any business yet.
      return { tenantKey: null, via: 'supabase', email: user.email, unlinked: true };
    }
  }

  // Fallback: the access-key cookie session.
  const cookie = deps.sessionTenant ? deps.sessionTenant(req) : null;
  if (cookie) return { tenantKey: cookie.tenantKey, via: 'key' };
  return null;
}
