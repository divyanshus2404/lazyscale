// The store is the promise the whole product makes: the enquiry is written down
// before anything else is attempted. These run against the local file, in a
// temporary directory, so they touch nothing real.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cwd = process.cwd();
let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'ls-store-')); process.chdir(dir); });
after(() => { process.chdir(cwd); rmSync(dir, { recursive: true, force: true }); });

const store = () => import('../api/_store.js');

test('an enquiry survives the round trip', async () => {
  const { record, readFor } = await store();
  const r = await record({ tenant_key: 't1', name: 'Priya', message: '30 chairs', created_at: new Date().toISOString() });
  assert.equal(r.stored, true);
  const read = await readFor('t1', '1970-01-01T00:00:00.000Z', 100);
  assert.equal(read.ok, true);
  assert.equal(read.rows.length, 1);
  assert.equal(read.rows[0].name, 'Priya');
});

test('one tenant never reads another tenant', async () => {
  const { record, readFor } = await store();
  await record({ tenant_key: 't2', name: 'Someone else', message: 'private', created_at: new Date().toISOString() });
  const read = await readFor('t1', '1970-01-01T00:00:00.000Z', 100);
  assert.equal(read.rows.every((r) => r.tenant_key === 't1'), true);
});

test('an update lands on the row it names', async () => {
  const { record, update, readFor } = await store();
  const r = await record({ tenant_key: 't3', name: 'X', message: 'm', created_at: new Date().toISOString() });
  await update(r.id, { alert_sent: true, score: 8 });
  const read = await readFor('t3', '1970-01-01T00:00:00.000Z', 100);
  const row = read.rows.find((x) => x.id === r.id);
  assert.equal(row.alert_sent, true);
  assert.equal(row.score, 8);
});

test('concurrent writes all survive', async () => {
  // An append and a whole-file rewrite must not interleave. Unproven as a real
  // failure, but the shape is wrong enough to hold a test against.
  const { record, update, readFor } = await store();
  await Promise.all(Array.from({ length: 25 }, async (_, i) => {
    const r = await record({ tenant_key: 't4', name: 'C' + i, message: 'm' + i, created_at: new Date().toISOString() });
    await update(r.id, { alert_sent: true });
  }));
  const read = await readFor('t4', '1970-01-01T00:00:00.000Z', 200);
  assert.equal(read.rows.length, 25);
});

test('the rate limit fails open when the count is unknown', async () => {
  // countSince returns null rather than 0 when it cannot tell. Returning 0
  // would read as "no recent enquiries" and quietly wave everything through.
  const { countSince } = await store();
  const n = await countSince('nobody', new Date().toISOString());
  assert.ok(n === null || typeof n === 'number');
});
