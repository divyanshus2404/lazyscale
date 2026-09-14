// Durable record of every enquiry.
//
// Until now an enquiry existed only as an email. That breaks two promises: the
// monthly performance review every job description commits to, and the baseline
// comparison the first case study depends on. It also means a failure at the
// email provider loses the lead outright.
//
// Supabase is the target because it is free at this scale and already on the
// roadmap, but nothing here assumes it stays that way — swap the body of
// `record` and the rest of the codebase does not change.
//
// Environment:
//   SUPABASE_URL                  https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY     service role, server-side only, never shipped
//
// With neither set, every call is a no-op that reports it stored nothing. That
// is deliberate: logging must never be the reason an enquiry fails to reach a
// human.

const TABLE = 'enquiries';

export function storeConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Append one enquiry. Never throws — a logging failure must not take down the
 * request that is trying to deliver a lead.
 * @returns {Promise<{stored: boolean, reason?: string}>}
 */
export async function record(row) {
  if (!storeConfigured()) return { stored: false, reason: 'not_configured' };

  const url = process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + TABLE;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(row)
    });
    if (!res.ok) {
      console.error('store rejected', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return { stored: false, reason: `http_${res.status}` };
    }
    return { stored: true };
  } catch (err) {
    console.error('store failed', err?.name || err);
    return { stored: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read enquiries for one tenant, newest first. Used by /api/stats to build the
 * monthly review rather than anyone reading the table by hand.
 */
export async function readFor(tenantKey, sinceISO, limit = 1000) {
  if (!storeConfigured()) return { ok: false, reason: 'not_configured', rows: [] };

  const base = process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + TABLE;
  const qs = new URLSearchParams({
    tenant_key: 'eq.' + tenantKey,
    created_at: 'gte.' + sinceISO,
    order: 'created_at.desc',
    limit: String(limit)
  });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${base}?${qs}`, {
      signal: ctrl.signal,
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}`, rows: [] };
    return { ok: true, rows: await res.json() };
  } catch (err) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network', rows: [] };
  } finally {
    clearTimeout(timer);
  }
}
