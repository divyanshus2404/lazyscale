// GET /api/stats?k=<tenantKey>&s=<ADMIN_SECRET>&days=30
//
// The numbers for a client's monthly performance review. Every job description
// promises one; this is where it comes from, rather than anyone counting emails
// by hand.
//
// Environment:
//   ADMIN_SECRET   required. Without it this endpoint refuses every request.
//   SUPABASE_*     see _store.js

import { readFor, storeAvailable } from './_store.js';

const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);

function median(ns) {
  if (!ns.length) return null;
  const s = [...ns].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const secret = process.env.ADMIN_SECRET;
  // No secret set means no access, not open access. A stats endpoint that
  // defaults to public would hand a stranger a client's entire enquiry history.
  if (!secret || clean(req.query?.s) !== secret) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  if (!storeAvailable()) {
    return res.status(503).json({ ok: false, error: 'No store configured — nothing has been recorded yet.' });
  }

  const k = clean(req.query?.k, 64);
  if (!k) return res.status(400).json({ ok: false, error: 'Missing tenant key' });

  const days = Math.min(365, Math.max(1, parseInt(req.query?.days, 10) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { ok, reason, rows } = await readFor(k, since);
  if (!ok) return res.status(502).json({ ok: false, error: 'Could not read the store', reason });

  const scored = rows.filter((r) => r.scored);
  const escalated = rows.filter((r) => r.needs_human === true);
  const lost = rows.filter((r) => r.alert_sent === false);

  // Which escalation reasons keep coming back — the one number that tells you
  // what to fix next, and the thing the review is supposed to surface.
  const reasons = {};
  escalated.forEach((r) => {
    const why = (r.escalation_reason || 'unspecified').toLowerCase().slice(0, 60);
    reasons[why] = (reasons[why] || 0) + 1;
  });

  const byDay = {};
  rows.forEach((r) => {
    const d = String(r.created_at || '').slice(0, 10);
    if (d) byDay[d] = (byDay[d] || 0) + 1;
  });

  return res.status(200).json({
    ok: true,
    tenant: k,
    windowDays: days,
    since,
    enquiries: rows.length,
    scored: scored.length,
    medianScore: median(scored.map((r) => Number(r.score)).filter(Number.isFinite)),
    escalated: escalated.length,
    handledWithoutAHuman: rows.length ? +(((rows.length - escalated.length) / rows.length) * 100).toFixed(1) : null,
    alertsFailed: lost.length,
    topEscalationReasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([reason, count]) => ({ reason, count })),
    byDay
  });
}
