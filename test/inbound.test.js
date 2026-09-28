// The drop-in's pure helpers. Each case here is something that either broke or
// would have been expensive to get wrong: a duplicate slipping through, a form
// field silently dropped, an origin check that lets anyone post.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintOf, originAllowed, pick, extras, FIELDS, leadInput } from '../api/inbound.js';

// The capture -> lead -> sequence wiring. leadInput is the pure seam the handler
// hands to newLead, so the contract that starts (or does not start) a sequence
// is pinned here rather than buried in the endpoint.
const cap = { name: 'Meera', email: 'meera@example.com', phone: '', message: 'hair transplant cost?', source: 'whatsapp', at: '2026-03-02T05:00:00.000Z' };

test('a captured enquiry becomes a lead linked back to its enquiry', () => {
  const q = { ok: true, score: 8, intent: 'new_business', needsHuman: false, reply: 'Hi Meera, ...' };
  const li = leadInput('glow', cap, q, 'enq-123');
  assert.equal(li.tenant_key, 'glow');
  assert.equal(li.enquiry_id, 'enq-123');
  assert.equal(li.channel, 'whatsapp');
  assert.equal(li.score, 8);
  assert.equal(li.needs_human, false);
  assert.equal(li.reply_draft, 'Hi Meera, ...');
  // the sequence starts from when the enquiry arrived
  assert.equal(li.sequence_start_at, cap.at);
  assert.equal(li.created_at, cap.at);
});

test('an escalated enquiry starts a lead that will not be chased', () => {
  const q = { ok: true, score: 3, intent: 'support', needsHuman: true, reply: '' };
  const li = leadInput('glow', cap, q, 'enq-9');
  assert.equal(li.needs_human, true);   // newLead turns this into handed_to_human
  assert.equal(li.reply_draft, null);
});

test('an unscored enquiry (no API key) still starts a lead, safely', () => {
  const q = { ok: false, reason: 'no_api_key' };
  const li = leadInput('glow', cap, q, 'enq-1');
  assert.equal(li.score, null);
  assert.equal(li.intent, null);
  assert.equal(li.needs_human, false); // unknown is not an escalation, it is chased
  assert.equal(li.channel, 'whatsapp');
});

test('leadInput defaults a missing channel to the web form', () => {
  const li = leadInput('glow', { ...cap, source: '' }, { ok: false }, 'e');
  assert.equal(li.channel, 'web form');
});

test('the same enquiry twice makes the same fingerprint', () => {
  const lead = { email: 'A@Example.com', phone: '+91 76682 29271', message: 'Need  30  chairs ' };
  const again = { email: 'a@example.com', phone: '9176682 29271'.replace('91', '+91 '), message: 'need 30 chairs' };
  assert.equal(fingerprintOf('demo', lead), fingerprintOf('demo', again));
});

test('a different tenant never collides with another tenant', () => {
  const lead = { email: 'a@example.com', message: 'hello' };
  assert.notEqual(fingerprintOf('demo', lead), fingerprintOf('other', lead));
});

test('a different message is a different enquiry', () => {
  assert.notEqual(
    fingerprintOf('demo', { email: 'a@example.com', message: 'thirty chairs' }),
    fingerprintOf('demo', { email: 'a@example.com', message: 'forty chairs' })
  );
});

test('the fingerprint carries no readable address', () => {
  const fp = fingerprintOf('demo', { email: 'priya@example.com', message: 'hi' });
  assert.match(fp, /^[0-9a-f]{32}$/);
  assert.equal(fp.includes('priya'), false);
});

test('no configured origins means the endpoint stays open', () => {
  assert.deepEqual(originAllowed({}, 'https://anything.example'), { ok: true, echo: '*' });
});

test('a configured origin is matched past trailing slashes and case', () => {
  const site = { origins: ['https://Shop.example.com'] };
  assert.equal(originAllowed(site, 'https://shop.example.com/').ok, true);
  assert.equal(originAllowed(site, 'https://shop.example.com').echo, 'https://Shop.example.com');
});

test('an origin outside the list is refused', () => {
  assert.equal(originAllowed({ origins: ['https://shop.example.com'] }, 'https://evil.example').ok, false);
});

test('a request with no Origin is allowed — it is not a browser', () => {
  // curl, a server-side form post and an email webhook all arrive without one.
  assert.equal(originAllowed({ origins: ['https://shop.example.com'] }, '').ok, true);
});

test('form fields are found whatever the form calls them', () => {
  assert.equal(pick({ 'Your-Name': 'Priya' }, FIELDS.name), 'Priya');
  assert.equal(pick({ EMAIL_ADDRESS: 'p@example.com' }, FIELDS.email), 'p@example.com');
  assert.equal(pick({ 'contact number': '9999' }, FIELDS.phone), '9999');
  assert.equal(pick({ Enquiry: '30 chairs' }, FIELDS.message), '30 chairs');
});

test('an empty field is not a match, so the next name is tried', () => {
  assert.equal(pick({ name: '   ', fullname: 'Priya' }, FIELDS.name), 'Priya');
});

test('unmapped fields are kept, and plumbing is not', () => {
  const out = extras({
    name: 'Priya', budget: '50000', k: 'demo',
    _redirect: '/thanks', _gotcha: 'trap', _honey: 'trap'
  });
  assert.equal(out.budget, '50000');
  assert.equal('name' in out, false);
  assert.equal('k' in out, false);
  // These three are plumbing. They were leaking into the record and the alert
  // because the check compared normalised names against underscored ones.
  assert.equal('_redirect' in out, false);
  assert.equal('_gotcha' in out, false);
  assert.equal('_honey' in out, false);
});
