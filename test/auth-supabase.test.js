// The Supabase-auth path: mapping a signed-in user to their business, and the
// dual-path request gate (Supabase bearer wins, access-key cookie falls back).
// verifyBearer itself calls Supabase over the network, so here it is injected.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';

const T = join(tmpdir(), `sa-t-${process.pid}.jsonl`);
let tenantKeyForEmail, requestTenant;

before(async () => {
  process.env.TENANTS_FILE = T;
  delete process.env.VERCEL;
  await writeFile(T,
    JSON.stringify({ key: 'glow', ownerEmail: 'owner@glow.in', members: ['staff@glow.in'] }) + '\n' +
    JSON.stringify({ key: 'acme', ownerEmail: 'boss@acme.com' }) + '\n');
  ({ tenantKeyForEmail } = await import('../api/_tenants.js'));
  ({ requestTenant } = await import('../api/_auth.js'));
});
after(() => rm(T, { force: true }));

test('an owner email maps to their tenant', async () => {
  assert.equal(await tenantKeyForEmail('owner@glow.in'), 'glow');
});

test('a member email maps to the same tenant', async () => {
  assert.equal(await tenantKeyForEmail('staff@glow.in'), 'glow');
});

test('email matching is case-insensitive', async () => {
  assert.equal(await tenantKeyForEmail('Owner@Glow.IN'), 'glow');
});

test('an unknown email maps to no tenant', async () => {
  assert.equal(await tenantKeyForEmail('random@nowhere.com'), null);
});

test('a valid Supabase bearer resolves to the user tenant', async () => {
  const fakeVerify = async (t) => (t === 'good' ? { email: 'staff@glow.in', id: 'u1' } : null);
  const who = await requestTenant(
    { headers: { authorization: 'Bearer good' } },
    { verifyBearer: fakeVerify }
  );
  assert.deepEqual(who, { tenantKey: 'glow', via: 'supabase', email: 'staff@glow.in' });
});

test('a signed-in user with no linked business is flagged unlinked, not admitted', async () => {
  const fakeVerify = async () => ({ email: 'stranger@x.com', id: 'u2' });
  const who = await requestTenant(
    { headers: { authorization: 'Bearer good' } },
    { verifyBearer: fakeVerify }
  );
  assert.equal(who.tenantKey, null);
  assert.equal(who.unlinked, true);
});

test('an invalid bearer falls through to the cookie, then to nothing', async () => {
  const fakeVerify = async () => null;
  const none = await requestTenant({ headers: { authorization: 'Bearer bad' } }, { verifyBearer: fakeVerify });
  assert.equal(none, null);

  const viaCookie = await requestTenant(
    { headers: { authorization: 'Bearer bad' } },
    { verifyBearer: fakeVerify, sessionTenant: () => ({ tenantKey: 'acme' }) }
  );
  assert.deepEqual(viaCookie, { tenantKey: 'acme', via: 'key' });
});

test('with no bearer at all, the cookie session is used', async () => {
  const who = await requestTenant({ headers: {} }, { sessionTenant: () => ({ tenantKey: 'glow' }) });
  assert.deepEqual(who, { tenantKey: 'glow', via: 'key' });
});
