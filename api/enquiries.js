// GET /api/enquiries?k=<tenantKey>&s=<ADMIN_SECRET>&days=30&limit=200
//
// The enquiries themselves, newest first, for the console at /app. /api/stats
// answers "how did the month go"; this answers "what did they actually say",
// which is the question you have at 9am with a coffee.
//
// Environment:
//   ADMIN_SECRET   required. Without it this endpoint refuses every request.
//   SUPABASE_*     see _store.js

import { readFor, storeAvailable } from './_store.js';

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const secret = process.env.ADMIN_SECRET;
  // Same rule as /api/stats: no secret configured means no access, never open
  // access. This endpoint returns customers' names, addresses and messages.
  if (!secret || clean(req.query?.s) !== secret) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  if (!storeAvailable()) {
    return res.status(503).json({
      ok: false,
      error: 'No store configured — nothing has been recorded yet.',
    });
  }

  const k = clean(req.query?.k, 64);
  if (!k) return res.status(400).json({ ok: false, error: 'Missing tenant key' });

  const days = Math.min(365, Math.max(1, parseInt(req.query?.days, 10) || 30));
  const limit = Math.min(500, Math.max(1, parseInt(req.query?.limit, 10) || 200));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const read = await readFor(k, since, limit);
  if (!read.ok) {
    return res.status(502).json({ ok: false, error: read.error || 'Could not read the store' });
  }

  // Newest first. The store returns pages in insertion order.
  const rows = [...read.rows].sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  );

  return res.status(200).json({
    ok: true,
    tenant: k,
    windowDays: days,
    since,
    // Say when the list is a slice rather than the whole window, for the same
    // reason /api/stats does: a number that is quietly wrong is worse than one
    // that is missing.
    truncated: !!read.truncated,
    partialRead: !!read.partial,
    count: rows.length,
    enquiries: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name || '',
      email: r.email || '',
      phone: r.phone || '',
      message: r.message || '',
      source: r.source || '',
      forwardedBy: r.forwarded_by || '',
      scored: !!r.scored,
      score: r.score === null || r.score === undefined ? null : Number(r.score),
      intent: r.intent || '',
      needsHuman: r.needs_human === null || r.needs_human === undefined ? null : !!r.needs_human,
      escalationReason: r.escalation_reason || '',
      replyDraft: r.reply_draft || '',
      alertSent: !!r.alert_sent,
    })),
  });
}
