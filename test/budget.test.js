// The durable daily spend cap. This is the thing standing between a public form
// and an unbounded Claude bill, so its behaviour is pinned exactly.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cwd = process.cwd();
let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'ls-budget-')); process.chdir(dir); });
after(() => { process.chdir(cwd); rmSync(dir, { recursive: true, force: true }); delete process.env.MODEL_DAILY_CAP; });

function seed(n) {
  const now = new Date().toISOString();
  const rows = Array.from({ length: n }, (_, i) =>
    JSON.stringify({ id: 'r' + i, tenant_key: 't', created_at: now })).join('\n');
  writeFileSync('.local-enquiries.jsonl', rows + '\n');
}

test('a cap of zero disables the paid model entirely', async () => {
  process.env.MODEL_DAILY_CAP = '0';
  const { modelBudgetOk } = await import('../api/_budget.js?d');
  const r = await modelBudgetOk();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'model_disabled');
});

test('under the ceiling, spending is allowed', async () => {
  process.env.MODEL_DAILY_CAP = '5';
  seed(2);
  const { modelBudgetOk } = await import('../api/_budget.js?a');
  const r = await modelBudgetOk();
  assert.equal(r.ok, true);
  assert.equal(r.used, 2);
  assert.equal(r.cap, 5);
});

test('at the ceiling, the paid call is refused', async () => {
  process.env.MODEL_DAILY_CAP = '3';
  seed(3);
  const { modelBudgetOk } = await import('../api/_budget.js?b');
  const r = await modelBudgetOk();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'daily_cap');
});

test('the default ceiling is a sane 300, not unbounded', async () => {
  delete process.env.MODEL_DAILY_CAP;
  const { dailyCap } = await import('../api/_budget.js?c');
  assert.equal(dailyCap(), 300);
});
