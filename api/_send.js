// The sending layer: how a drafted message actually leaves the building.
//
// The follow-up engine decides WHAT to send; this decides HOW it goes out. Today
// that is email via Resend (free tier, so no founder spend). WhatsApp slots in
// here later behind the same `deliver` interface, and the engine does not change.
//
// Principles kept from the rest of the codebase:
//  - Never throws. A send failure is data, not an exception.
//  - Gated by the daily email cap (api/_budget.js), so cost cannot run away.
//  - Degrades safely: no RESEND_API_KEY, or a lead with no email, is not an
//    error. The chase is still recorded; it just was not delivered. The owner
//    sees the draft in the inbox either way.
//
// Environment: RESEND_API_KEY (to actually send), LEAD_REPLY_FROM (optional
// sending identity), EMAIL_DAILY_CAP (via _budget.js).

import { emailBudgetOk } from './_budget.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Low-level: send one email through Resend. Never throws. Injectable fetch. */
export async function sendEmail({ to, from, subject, text, replyTo }, deps = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'not_configured' };
  if (!to || !EMAIL_RE.test(to)) return { ok: false, reason: 'bad_address' };
  const doFetch = deps.fetch || fetch;

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(text)}</div>`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await doFetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: from || process.env.LEAD_REPLY_FROM || 'LazyScale <onboarding@resend.dev>',
        to: [to], subject, text, html,
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
    if (!res.ok) {
      console.error('resend', res.status);
      return { ok: false, reason: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Deliver one follow-up to a lead over the best available channel.
 *
 * Returns { ok, delivered, reason, channel }:
 *  - ok:true, delivered:true   it went out.
 *  - ok:true, delivered:false  intentionally not sent (no email on the lead, or
 *                              no provider configured). The sequence should still
 *                              advance; the draft is recorded, not delivered.
 *  - ok:false                  a transient problem (budget cap, network). The
 *                              caller should NOT advance; retry on the next tick.
 *
 * `cfg` is the tenant's resolved config (for the reply-to / from identity).
 * `deps` injects emailBudgetOk and fetch for tests.
 */
export async function deliver(lead, message, cfg = {}, deps = {}) {
  const email = (lead.email && EMAIL_RE.test(lead.email) && lead.email) ||
                (lead.contact && EMAIL_RE.test(lead.contact) && lead.contact) || null;

  // No email channel on this lead. Not a failure; just nothing to send to yet.
  // (A WhatsApp number would be picked here once that adapter exists.)
  if (!email) return { ok: true, delivered: false, reason: 'no_email_channel', channel: null };

  // Spend guard first. A cap or an unknown count means do not send now; retry.
  const budget = await (deps.emailBudgetOk || emailBudgetOk)();
  if (!budget.ok) return { ok: false, delivered: false, reason: budget.reason, channel: 'email' };

  const res = await sendEmail({
    to: email,
    subject: `Following up on your enquiry${cfg.displayName && cfg.displayName !== 'LazyScale' ? ` to ${cfg.displayName}` : ''}`,
    text: message,
    // Replies go to the business, not to us, so a human can take over.
    replyTo: cfg.ownerEmail || process.env.OWNER_EMAIL || undefined
  }, deps);

  // No provider configured is a safe no-op: advance the sequence, record the
  // draft, mark it undelivered. Anything else transient: hold and retry.
  if (!res.ok && res.reason === 'not_configured') {
    return { ok: true, delivered: false, reason: 'not_configured', channel: 'email' };
  }
  if (!res.ok) return { ok: false, delivered: false, reason: res.reason, channel: 'email' };
  return { ok: true, delivered: true, reason: 'sent', channel: 'email' };
}
