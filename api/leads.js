// The owner inbox data. GET /api/leads returns only the signed-in tenant's
// leads, ever. The gate is sessionTenant: no valid cookie, no data.
//
// This is the whole point of the auth wall. Every row returned is filtered by
// the tenant baked into the session signature, so one business physically
// cannot read another's leads by asking. There is no tenant parameter to tamper
// with; it comes from the cookie, not the request.

import { sessionTenant } from './_session.js';
import { requestTenant } from './_auth.js';
import { listByTenant } from './_leads.js';

// Only the fields the inbox needs. No internal plumbing leaves the server.
function present(lead) {
  return {
    id: lead.id,
    name: lead.name || null,
    channel: lead.channel || null,
    contact: lead.contact || lead.email || lead.phone || null,
    message: lead.message || null,
    status: lead.status || 'new',
    score: lead.score ?? null,
    intent: lead.intent || null,
    needs_human: lead.needs_human === true,
    reply_draft: lead.reply_draft || null,
    last_draft: lead.last_draft || null,
    attempts: Number(lead.attempts || 0),
    created_at: lead.created_at || null,
    last_attempt_at: lead.last_attempt_at || null
  };
}

function summarise(leads) {
  const hot = leads.filter((l) => Number(l.score) >= 8 && !l.needs_human).length;
  const needhuman = leads.filter((l) => l.needs_human || l.status === 'handed_to_human').length;
  const replied = leads.filter((l) => l.replied || l.status === 'engaged').length;
  return { total: leads.length, hot, needs_human: needhuman, replied };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  // Supabase social/email sign-in first, access-key cookie as fallback.
  const who = await requestTenant(req, { sessionTenant });
  if (who?.unlinked) {
    return res.status(403).json({ ok: false, error: 'Your account is not linked to a business yet.', email: who.email });
  }
  if (!who?.tenantKey) return res.status(401).json({ ok: false, error: 'Not signed in.' });

  try {
    const rows = await listByTenant(who.tenantKey, 100);
    return res.status(200).json({
      ok: true,
      tenant: who.tenantKey,
      via: who.via,
      stats: summarise(rows),
      leads: rows.map(present)
    });
  } catch (err) {
    console.error('leads list failed', err?.message);
    return res.status(500).json({ ok: false, error: 'Could not load leads.' });
  }
}
