// The product, end to end, over real code: the leads store, the processor, and
// the engine together. Time is driven by hand so a whole week runs in a
// millisecond, but nothing else is faked. A lead is captured, chased on
// schedule, and the sequence ends the moment it replies.
//
// This is the run that is meant to speak for itself. If it is green, the core of
// LazyScale works.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';

const FILE = join(tmpdir(), `ls-leads-${process.pid}-${Math.random().toString(16).slice(2)}.jsonl`);

let newLead, getLead, patchLead, runTick;

before(async () => {
  process.env.LEADS_FILE = FILE;
  delete process.env.VERCEL;                 // force local-file mode
  ({ newLead, getLead, patchLead } = await import('../api/_leads.js'));
  ({ runTick } = await import('../api/tick.js'));
});
beforeEach(() => writeFile(FILE, ''));
after(() => rm(FILE, { force: true }));

const START = new Date('2026-03-02T05:00:00.000Z'); // ~10:30am IST, daytime
const at = (days) => new Date(START.getTime() + days * 86400 * 1000);

test('a silent lead is chased four times, then the sequence closes', async () => {
  const { lead } = await newLead({
    tenant_key: 'acme', name: 'Rahul', channel: 'whatsapp',
    message: '3BHK in Whitefield, 1.2cr, need it in 2 months',
    score: 9, created_at: START.toISOString(), sequence_start_at: START.toISOString()
  });

  // Same day: nothing due yet.
  let r = await runTick(START);
  assert.equal(r.actions[0].action, 'wait');

  // Days 1, 3, 5, 7: one chase each, counting up.
  for (const [day, attempt] of [[1, 1], [3, 2], [5, 3], [7, 4]]) {
    r = await runTick(at(day));
    const mine = r.actions.find((a) => a.id === lead.id);
    assert.equal(mine.action, 'follow_up', `day ${day} should chase`);
    assert.equal(mine.attempt, attempt);
    const row = await getLead(lead.id);
    assert.equal(row.attempts, attempt);
    assert.ok(row.last_draft.includes('Rahul'), 'the draft is addressed to the lead');
  }

  // Day 9: out of chases. The sequence closes, exactly once.
  r = await runTick(at(9));
  assert.equal(r.actions.find((a) => a.id === lead.id).reason, 'exhausted');
  assert.equal((await getLead(lead.id)).status, 'closed');

  // Day 11: closed leads are no longer even considered.
  r = await runTick(at(11));
  assert.equal(r.actions.find((a) => a.id === lead.id), undefined);
});

test('a reply stops the chasing immediately', async () => {
  const { lead } = await newLead({
    tenant_key: 'acme', name: 'Priya', channel: 'web',
    created_at: START.toISOString(), sequence_start_at: START.toISOString()
  });

  // First chase goes out on day 1.
  let r = await runTick(at(1));
  assert.equal(r.actions.find((a) => a.id === lead.id).action, 'follow_up');

  // She replies on day 2.
  await patchLead(lead.id, { status: 'engaged', replied: true, last_inbound_at: at(2).toISOString() });

  // Day 3 would have been the second chase. It must not happen: replied leads
  // leave the candidate set, so the engine never touches her again.
  r = await runTick(at(3));
  assert.equal(r.actions.find((a) => a.id === lead.id), undefined);
  assert.equal((await getLead(lead.id)).attempts, 1); // still just the one chase
});

test('a new lead keeps the link back to its enquiry', async () => {
  const { lead } = await newLead({
    tenant_key: 'acme', name: 'Meera', enquiry_id: 'enq-42', email: 'm@x.com',
    created_at: START.toISOString(), sequence_start_at: START.toISOString()
  });
  const row = await getLead(lead.id);
  assert.equal(row.enquiry_id, 'enq-42', 'the enquiry link must survive');
  assert.equal(row.email, 'm@x.com', 'the contact channel is kept for sending');
});

test('an escalated lead is never chased', async () => {
  const { lead } = await newLead({
    tenant_key: 'acme', name: 'Anon', needs_human: true,
    message: 'I want a refund, this is unacceptable',
    created_at: START.toISOString(), sequence_start_at: START.toISOString()
  });
  // handed_to_human is not an active status, so it is not even a candidate.
  const r = await runTick(at(5));
  assert.equal(r.actions.find((a) => a.id === lead.id), undefined);
  assert.equal((await getLead(lead.id)).attempts, 0);
});

test('tenants are isolated: a tick can run for one only', async () => {
  await newLead({ tenant_key: 'acme', name: 'A', created_at: START.toISOString(), sequence_start_at: START.toISOString() });
  await newLead({ tenant_key: 'globex', name: 'B', created_at: START.toISOString(), sequence_start_at: START.toISOString() });
  const r = await runTick(at(1), { tenant: 'acme' });
  assert.equal(r.considered, 1);
  assert.equal(r.actions[0].action, 'follow_up');
});
