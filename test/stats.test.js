// The monthly-review metric shown to a paying client.
//
// It used to compute "handled without a human" as (enquiries - escalated) /
// enquiries, so a month where the model was off and every alert failed still
// reported 100% handled. This pins it to replies that actually went out.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cwd = process.cwd();
let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'ls-stats-')); process.chdir(dir); });
after(() => { process.chdir(cwd); rmSync(dir, { recursive: true, force: true }); });

function mockRes() {
  return { code: 0, body: null,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; } };
}

test('handledWithoutAHuman counts replies that went out, not un-escalated rows', async () => {
  process.env.ADMIN_SECRET = 'secret';
  const { record, update } = await import('../api/_store.js');
  const stats = (await import('../api/stats.js')).default;

  // Two enquiries: one genuinely auto-replied, one that needed a human.
  const a = await record({ tenant_key: 't', name: 'Auto', message: 'q', created_at: new Date().toISOString() });
  await update(a.id, { scored: true, score: 9, alert_sent: true, auto_replied: true, needs_human: false });
  const b = await record({ tenant_key: 't', name: 'Human', message: 'complaint', created_at: new Date().toISOString() });
  await update(b.id, { scored: true, score: 3, alert_sent: true, auto_replied: false, needs_human: true });

  const res = mockRes();
  await stats({ method: 'GET', query: { k: 't', s: 'secret', days: 30 } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.enquiries, 2);
  assert.equal(res.body.autoReplied, 1);
  assert.equal(res.body.handledWithoutAHuman, 50);
});

test('a month where nothing was answered reports 0, not 100', async () => {
  process.env.ADMIN_SECRET = 'secret';
  const { record } = await import('../api/_store.js');
  const stats = (await import('../api/stats.js')).default;

  // Captured only: no model, no reply, alert never marked sent. The old formula
  // returned 100% here because nothing was escalated.
  await record({ tenant_key: 'u', name: 'A', message: 'x', created_at: new Date().toISOString(), alert_sent: false });
  await record({ tenant_key: 'u', name: 'B', message: 'y', created_at: new Date().toISOString(), alert_sent: false });

  const res = mockRes();
  await stats({ method: 'GET', query: { k: 'u', s: 'secret', days: 30 } }, res);
  assert.equal(res.body.enquiries, 2);
  assert.equal(res.body.handledWithoutAHuman, 0);
});
