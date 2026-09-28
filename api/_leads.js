// Where a lead lives while the follow-up engine works it.
//
// The enquiries table (api/_store.js) is the durable receipt: written once, the
// instant an enquiry lands, so a failure downstream never loses it. A lead is
// the living thing on top of that: it has a state, an attempt count, and a next
// due time, and it changes as the engine chases it.
//
// Same shape as _store.js on purpose: never throws, a local JSON Lines file on a
// laptop, Supabase in production. Build and watch it work with no project set up.
//
// Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (as _store.js).
// LEADS_FILE overrides the local path, so a test can use a throwaway file.

const TABLE = 'leads';
const LOCAL_FILE = () => process.env.LEADS_FILE || '.local-leads.jsonl';
const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const useLocalFile = () => !process.env.VERCEL && !configured();

// A lead is a candidate for a tick while it is still being worked. Replied, won,
// lost, escalated and exhausted leads are done, so the tick skips them.
export const ACTIVE = ['new', 'following_up'];

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);

let queue = Promise.resolve();
function withLock(fn) {
  const run = queue.then(fn, fn);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function readAll() {
  const { readFile } = await import('node:fs/promises');
  let text = '';
  try { text = await readFile(LOCAL_FILE(), 'utf8'); } catch { return []; }
  return text.split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

// ── create ───────────────────────────────────────────────────────────────────
/**
 * Start a lead and its follow-up sequence. Defaults are set here so the engine
 * always has what planFollowUp needs: a status, an attempt count, a start time.
 */
export async function newLead(input) {
  const now = new Date().toISOString();
  const lead = {
    id: uuid(),
    tenant_key: input.tenant_key || '_lazyscale',
    // The enquiry this lead came from: the durable receipt in the enquiries
    // table. Kept so the lead and its origin are one linked thing, not two
    // orphaned rows. Dropping this silently was a real wiring bug.
    enquiry_id: input.enquiry_id || null,
    name: input.name || null,
    email: input.email || null,
    phone: input.phone || null,
    contact: input.contact || input.email || input.phone || null,
    channel: input.channel || input.source || 'web',
    message: input.message || null,
    score: input.score ?? null,
    intent: input.intent || null,
    needs_human: input.needs_human === true,
    reply_draft: input.reply_draft || null,
    status: input.needs_human ? 'handed_to_human' : 'new',
    attempts: 0,
    replied: false,
    opted_out: false,
    created_at: input.created_at || now,
    sequence_start_at: input.sequence_start_at || now,
    updated_at: now
  };

  if (useLocalFile()) {
    return withLock(async () => {
      const { appendFile } = await import('node:fs/promises');
      await appendFile(LOCAL_FILE(), JSON.stringify(lead) + '\n', 'utf8');
      return { ok: true, lead };
    }).catch(() => ({ ok: false, reason: 'local_write' }));
  }
  if (!configured()) return { ok: false, reason: 'not_configured' };

  const res = await supa('POST', '', lead, { Prefer: 'return=representation' });
  if (!res.ok) return { ok: false, reason: res.reason };
  return { ok: true, lead: Array.isArray(res.body) ? res.body[0] : res.body };
}

// ── read ─────────────────────────────────────────────────────────────────────
/** The leads a tick should consider: still active, optionally one tenant's. */
export async function listCandidates(tenantKey) {
  if (useLocalFile()) {
    const rows = await readAll();
    return rows.filter((r) => ACTIVE.includes(r.status) && (!tenantKey || r.tenant_key === tenantKey));
  }
  if (!configured()) return [];
  const qs = new URLSearchParams({ status: `in.(${ACTIVE.join(',')})`, select: '*', limit: '200' });
  if (tenantKey) qs.set('tenant_key', 'eq.' + tenantKey);
  const res = await supa('GET', '?' + qs.toString());
  return res.ok && Array.isArray(res.body) ? res.body : [];
}

/** Every lead for one tenant, newest first. What the owner inbox shows. */
export async function listByTenant(tenantKey, limit = 100) {
  if (useLocalFile()) {
    const rows = await readAll();
    return rows.filter((r) => r.tenant_key === tenantKey)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
  }
  if (!configured()) return [];
  const qs = new URLSearchParams({
    tenant_key: 'eq.' + tenantKey, select: '*', order: 'created_at.desc', limit: String(limit)
  });
  const res = await supa('GET', '?' + qs.toString());
  return res.ok && Array.isArray(res.body) ? res.body : [];
}

export async function getLead(id) {
  if (useLocalFile()) return (await readAll()).find((r) => r.id === id) || null;
  if (!configured()) return null;
  const res = await supa('GET', '?' + new URLSearchParams({ id: 'eq.' + id, select: '*', limit: '1' }));
  return res.ok && res.body?.[0] ? res.body[0] : null;
}

// ── update ───────────────────────────────────────────────────────────────────
/** Merge a patch onto a lead. Never throws; the enquiry receipt is already safe. */
export async function patchLead(id, patch) {
  if (!id) return { ok: false, reason: 'no_id' };
  const stamped = { ...patch, updated_at: new Date().toISOString() };

  if (useLocalFile()) {
    return withLock(async () => {
      const { writeFile } = await import('node:fs/promises');
      const rows = await readAll();
      let found = false;
      const out = rows.map((r) => (r.id === id ? (found = true, { ...r, ...stamped }) : r));
      if (!found) return { ok: false, reason: 'not_found' };
      await writeFile(LOCAL_FILE(), out.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
      return { ok: true };
    }).catch(() => ({ ok: false, reason: 'local_write' }));
  }
  if (!configured()) return { ok: false, reason: 'not_configured' };
  const res = await supa('PATCH', '?id=eq.' + encodeURIComponent(id), stamped);
  return res.ok ? { ok: true } : { ok: false, reason: res.reason };
}

// ── Supabase REST, same envelope as _store.js ────────────────────────────────
async function supa(method, suffix, body, extraHeaders = {}) {
  const url = process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + TABLE + suffix;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method, signal: ctrl.signal,
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'content-type': 'application/json', ...extraHeaders
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) { console.error('leads store', method, res.status); return { ok: false, reason: `http_${res.status}` }; }
    const parsed = method === 'GET' || extraHeaders.Prefer ? await res.json().catch(() => null) : null;
    return { ok: true, body: parsed };
  } catch (err) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
