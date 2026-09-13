// POST /api/email-in?k=<siteKey>&s=<secret>
//
// The forwarding route. A business adds one rule in Gmail so enquiry mail is
// copied to an inbound address, that address posts the mail here, and it joins
// the same pipeline as the website form. They never hand over a password and
// they can stop it by deleting the rule.
//
// Provider-agnostic on purpose. Inbound email services all post JSON with
// different field names, and which one is cheapest to run changes; normalising
// here means switching provider is a settings change, not a rewrite. Known
// shapes: Postmark, SendGrid Inbound Parse, Mailgun routes, CloudMailin, and a
// Cloudflare Email Worker posting {from, subject, text}.
//
// Environment:
//   TENANTS_JSON     same map api/inbound.js uses
//   EMAIL_IN_SECRET  shared secret; the ?s= value must match it
//
// Security note: the address is effectively public once a forwarding rule
// exists, so the secret in the query string is what stops anyone posting
// invented enquiries into a client's inbox. It is not a strong control — it is
// the one this architecture allows. Rotate it if a client stops working with us.

import inbound from './inbound.js';
import { originalSender, originalSubject, messageBody, looksForwarded } from './_forwarded.js';

const clean = (v, max = 2000) => String(v ?? '').trim().slice(0, max);
const ADDR = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

function parseBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  const text = String(b).slice(0, 200000);
  try { return JSON.parse(text); } catch { /* not JSON */ }
  const out = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}

// Pull {from, subject, text} out of whichever provider posted.
function normalise(b) {
  const from =
    b.From || b.from || b.sender || b.envelope?.from ||
    b.FromFull?.Email || b.headers?.from || '';
  const subject = b.Subject || b.subject || b.headers?.subject || '';
  const text =
    b.TextBody || b.text || b['body-plain'] || b.plain ||
    b.StrippedTextBody || b['stripped-text'] || b.body || '';
  const html = b.HtmlBody || b.html || b['body-html'] || '';
  return {
    from: clean(from, 320),
    subject: clean(subject, 300),
    // Fall back to de-tagged HTML when a client sent no plain part at all.
    text: clean(text, 20000) || clean(String(html).replace(/<[^>]+>/g, ' '), 20000)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const secret = process.env.EMAIL_IN_SECRET;
  if (!secret || clean(req.query?.s, 200) !== secret) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  const k = clean(req.query?.k, 64);
  if (!k) return res.status(400).json({ ok: false, error: 'Missing key' });

  const mail = normalise(parseBody(req));
  if (!mail.text && !mail.subject) {
    return res.status(400).json({ ok: false, error: 'Nothing usable in that message' });
  }

  // Who actually wrote. On a forward the envelope is the client, and the real
  // sender is named in the forward header — get this wrong and every reply goes
  // to the client instead of their customer.
  const fwd = originalSender(mail.text);
  const envelope = ADDR.exec(mail.from);
  const sender = fwd || (envelope ? { name: '', email: envelope[1] } : null);

  const subject = originalSubject(mail.text) || mail.subject;
  const body = messageBody(mail.text);

  // Hand to the same handler the web form uses, so there is one pipeline, one
  // set of guards and one thing to test.
  const synthetic = {
    method: 'POST',
    query: { k },
    headers: {},
    body: {
      name: clean(sender?.name, 120),
      email: clean(sender?.email, 200),
      message: clean([subject ? 'Subject: ' + subject : '', body].filter(Boolean).join('\n\n'), 1500),
      source: looksForwarded(mail.text) ? 'forwarded email' : 'email',
      forwarded_by: looksForwarded(mail.text) ? clean(mail.from, 200) : ''
    }
  };

  let status = 200, payload = null;
  const shim = {
    setHeader() {},
    status(c) { status = c; return this; },
    json(o) { payload = o; return this; },
    end() { return this; }
  };
  await inbound(synthetic, shim);
  return res.status(status === 303 ? 200 : status).json(payload || { ok: status < 400 });
}
