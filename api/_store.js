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

// On a laptop there is usually no Supabase project yet, and waiting for one is a
// bad reason not to be able to see the thing work. When running outside Vercel
// with no Supabase configured, rows go to a local JSON Lines file instead.
//
// Guarded on process.env.VERCEL, which Vercel sets on every deployment, so this
// path cannot be reached in production even by accident.
const LOCAL_FILE = '.local-enquiries.jsonl';
const useLocalFile = () => !process.env.VERCEL && !storeConfigured();

async function localAppend(row) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(LOCAL_FILE, JSON.stringify(row) + '\n', 'utf8');
  return { stored: true, local: true };
}

async function localRead(tenantKey, sinceISO, limit) {
  const { readFile } = await import('node:fs/promises');
  let text = '';
  try { text = await readFile(LOCAL_FILE, 'utf8'); } catch { return { ok: true, rows: [] }; }
  const rows = text.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && r.tenant_key === tenantKey && String(r.created_at || '') >= sinceISO)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
  return { ok: true, rows, local: true };
}

export function storeConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** True when anything at all will be recorded — Supabase, or the local file. */
export function storeAvailable() {
  return storeConfigured() || !process.env.VERCEL;
}

/**
 * Append one enquiry. Never throws — a logging failure must not take down the
 * request that is trying to deliver a lead.
 * @returns {Promise<{stored: boolean, reason?: string}>}
 */
export async function record(row) {
  if (useLocalFile()) {
    try { return await localAppend(row); }
    catch (err) { console.error('local store failed', err?.message); return { stored: false, reason: 'local_write' }; }
  }
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
  if (useLocalFile()) {
    try { return await localRead(tenantKey, sinceISO, limit); }
    catch (err) { return { ok: false, reason: 'local_read', rows: [] }; }
  }
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
