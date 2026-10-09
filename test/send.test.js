// The sending layer. Covers the deliver decision table (sent / safe no-op /
// transient hold) and that a tick advances a lead only when the send succeeds
// or is a safe no-op, and retries the same attempt on a transient failure.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';

let deliver, sendEmail, newLead, getLead, runTick;
const okBudget = async () => ({ ok: true, used: 0, cap: 90 });
const fetchOk = async () => ({ ok: true });
const fetchFail = async () => ({ ok: false, status: 500 });

const LEADS = join(tmpdir(), `send-l-${process.pid}.jsonl`);

before(async () => {
  process.env.LEADS_FILE = LEADS;
  delete process.env.VERCEL;
  ({ deliver, sendEmail } = await import('../api/_send.js'));
  ({ newLead, getLead } = await import('../api/_leads.js'));
  ({ runTick } = await import('../api/tick.js'));
});
after(() => rm(LEADS, { force: true }));
beforeEach(() => { delete process.env.RESEND_API_KEY; return writeFile(LEADS, ''); });

// ── deliver() decision table ─────────────────────────────────────────────────
test('a lead with no email is a safe no-op, not a failure', async () => {
  const r = await deliver({ name: 'X' }, 'hi', {}, { emailBudgetOk: okBudget });
  assert.deepEqual(r, { ok: true, delivered: false, reason: 'no_email_channel', channel: null });
});

test('with a key and an ok send, it delivers', async () => {
  process.env.RESEND_API_KEY = 'test';
  const r = await deliver({ email: 'a@b.com' }, 'hi', {}, { emailBudgetOk: okBudget, fetch: fetchOk });
  assert.deepEqual(r, { ok: true, delivered: true, reason: 'sent', channel: 'email' });
});

test('no provider configured is a safe no-op (sequence still advances)', async () => {
  // no RESEND_API_KEY set
  const r = await deliver({ email: 'a@b.com' }, 'hi', {}, { emailBudgetOk: okBudget });
  assert.equal(r.ok, true);
  assert.equal(r.delivered, false);
  assert.equal(r.reason, 'not_configured');
});

test('the daily cap holds the send, does not advance', async () => {
  process.env.RESEND_API_KEY = 'test';
  const capped = async () => ({ ok: false, reason: 'email_cap' });
  const r = await deliver({ email: 'a@b.com' }, 'hi', {}, { emailBudgetOk: capped, fetch: fetchOk });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'email_cap');
});

test('a provider error is transient, held for retry', async () => {
  process.env.RESEND_API_KEY = 'test';
  const r = await deliver({ email: 'a@b.com' }, 'hi', {}, { emailBudgetOk: okBudget, fetch: fetchFail });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'http_500');
});

test('reply-to is the business, so a patient reply reaches a human', async () => {
  process.env.RESEND_API_KEY = 'test';
  let body = null;
  const spy = async (_url, opts) => { body = JSON.parse(opts.body); return { ok: true }; };
  await deliver({ email: 'a@b.com' }, 'hi', { ownerEmail: 'clinic@x.in' }, { emailBudgetOk: okBudget, fetch: spy });
  assert.equal(body.reply_to, 'clinic@x.in');
});

test('sendEmail refuses a bad address and a missing key', async () => {
  assert.equal((await sendEmail({ to: 'nope' })).reason, 'not_configured'); // no key first
  process.env.RESEND_API_KEY = 'test';
  assert.equal((await sendEmail({ to: 'nope' })).reason, 'bad_address');
});

// ── tick integration: advance vs retry ───────────────────────────────────────
const START = new Date('2026-03-02T05:00:00.000Z');
const day = (n) => new Date(START.getTime() + n * 86400 * 1000);

test('a delivered chase advances the sequence and stamps sent time', async () => {
  const { lead } = await newLead({
    tenant_key: 'acme', name: 'Rahul', email: 'rahul@x.com',
    created_at: START.toISOString(), sequence_start_at: START.toISOString()
  });
  const r = await runTick(day(1), { tenant: 'acme', deliver: async () => ({ ok: true, delivered: true, reason: 'sent' }) });
  assert.equal(r.actions[0].action, 'follow_up');
  assert.equal(r.actions[0].delivered, true);
  const row = await getLead(lead.id);
  assert.equal(row.attempts, 1);
  assert.equal(row.last_delivery, 'sent');
  assert.ok(row.last_sent_at);
});

test('a transient send failure does NOT advance; it retries next tick', async () => {
  const { lead } = await newLead({
    tenant_key: 'acme', name: 'Priya', email: 'priya@x.com',
    created_at: START.toISOString(), sequence_start_at: START.toISOString()
  });
  const fail = async () => ({ ok: false, delivered: false, reason: 'network' });
  let r = await runTick(day(1), { tenant: 'acme', deliver: fail });
  assert.equal(r.actions[0].action, 'retry');
  assert.equal((await getLead(lead.id)).attempts, 0, 'attempt not consumed on failure');

  // next tick, delivery works: now it advances
  r = await runTick(day(1), { tenant: 'acme', deliver: async () => ({ ok: true, delivered: true, reason: 'sent' }) });
  assert.equal(r.actions[0].action, 'follow_up');
  assert.equal((await getLead(lead.id)).attempts, 1);
});
