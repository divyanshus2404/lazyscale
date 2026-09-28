// One tick of the follow-up engine.
//
// A scheduler (Vercel cron, or QStash later) calls this on a fixed beat. For
// every active lead it asks api/_followup.js what to do, and does exactly that:
// send the next chase, mark the sequence finished, or leave a waiting lead be.
//
// The decision is pure and tested (test/followup.test.js). This file is the thin
// shell that gives it hands: the store, the clock, and the sending. That
// separation is on purpose, so the rules can never be wrong without a test
// catching it.
//
// Sending is a channel adapter (WhatsApp, email) and is stubbed for now: the
// chase is drafted and recorded, not delivered, until a channel is wired. The
// draft is templated, so this whole loop runs with no AI key and no spend.
//
// Guard: set CRON_SECRET and call with ?key=... (or an Authorization: Bearer
// header). Without it the endpoint refuses, so nobody else can drive the engine.

import { listCandidates, patchLead } from './_leads.js';
import { planFollowUp, afterFollowUp } from './_followup.js';
import { getTenant } from './_tenants.js';

// A follow-up, one per attempt. Indian English, no pressure, one clear ask, and
// it never invents a price or a date. Later this becomes a model call, gated by
// the same budget cap as every other paid call; the shape does not change.
const CHASES = [
  (n) => `Hi ${n}, just following up on your enquiry. Happy to help whenever you are ready. What is the best time to talk?`,
  (n) => `Hi ${n}, checking in once more. If you are still looking, I can share a couple of options that fit what you asked for. Shall I?`,
  (n) => `Hi ${n}, I do not want to crowd your inbox. If now is not the right time, just say so and I will hold off. Otherwise, when suits you?`,
  (n) => `Hi ${n}, last note from me for now. Whenever you are ready to pick this up, reply here and I will take it from there.`
];

export function chaseDraft(lead, attempt, cfg) {
  const name = lead.name || 'there';
  const body = (CHASES[attempt - 1] || CHASES[CHASES.length - 1])(name);
  // The consent line ships once, on the first touch, and only if the tenant's
  // config asks for it (healthcare does). Never on later chases.
  const consent = attempt === 1 && cfg?.consentLine ? `\n\n${cfg.consentLine}` : '';
  return body + consent;
}

/**
 * Run one tick. Pure clock in, so a test can drive time by hand.
 * @returns {Promise<{ran_at, considered, actions}>}
 */
export async function runTick(now = new Date(), opts = {}) {
  const leads = await listCandidates(opts.tenant);
  const actions = [];
  const configCache = new Map();

  // Each tenant's cadence, quiet hours and consent line come from its config,
  // resolved once per tenant per tick. opts still wins, so a test can pin time.
  async function configFor(key) {
    if (!configCache.has(key)) configCache.set(key, (await getTenant(key)).resolved);
    return configCache.get(key);
  }

  for (const lead of leads) {
    const cfg = await configFor(lead.tenant_key);
    const fu = cfg.followUp || {};
    const plan = planFollowUp(lead, now, {
      scheduleHours: opts.scheduleHours || fu.scheduleHours,
      quiet: opts.quiet || fu.quiet,
      tzOffsetMinutes: opts.tzOffsetMinutes ?? fu.tzOffsetMinutes
    });

    if (plan.action === 'follow_up') {
      const draft = chaseDraft(lead, plan.attempt, cfg);
      // send(lead, draft) — channel adapter goes here.
      await patchLead(lead.id, { ...afterFollowUp(lead, now), last_draft: draft });
      actions.push({ id: lead.id, action: 'follow_up', attempt: plan.attempt, of: plan.of });
    } else if (plan.action === 'stop') {
      // Only exhausted needs writing back; the other stops are already terminal
      // states the lead carries, so re-stamping them would be noise.
      if (plan.reason === 'exhausted' && lead.status !== 'closed') {
        await patchLead(lead.id, { status: 'closed', closed_reason: 'exhausted' });
      }
      actions.push({ id: lead.id, action: 'stop', reason: plan.reason });
    } else {
      actions.push({ id: lead.id, action: 'wait', until: plan.until });
    }
  }

  return { ran_at: new Date(now instanceof Date ? now.getTime() : now).toISOString(), considered: leads.length, actions };
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret set, nobody gets in
  const url = new URL(req.url, 'http://localhost');
  const viaQuery = url.searchParams.get('key');
  const viaHeader = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  return viaQuery === secret || viaHeader === secret;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  try {
    const result = await runTick(new Date());
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('tick failed', err?.message);
    return res.status(500).json({ ok: false, error: 'tick_failed' });
  }
}
