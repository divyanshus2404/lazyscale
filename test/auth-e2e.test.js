// The auth wall, exercised through the real endpoints. A wrong key is refused, a
// right key gets a cookie, and that cookie returns ONLY its own tenant's leads.
// This is the test that proves one business cannot read another's enquiries.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm, writeFile } from 'node:fs/promises';

const T = join(tmpdir(), `auth-t-${process.pid}.jsonl`);
const L = join(tmpdir(), `auth-l-${process.pid}.jsonl`);

let sessionHandler, leadsHandler;

// A minimal req/res good enough for these serverless handlers.
function mkRes() {
  return {
    statusCode: 0, body: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    end() { return this; }
  };
}
const cookieFrom = (res) => String(res.headers['Set-Cookie'] || '').split(';')[0];

before(async () => {
  process.env.SESSION_SECRET = 'e2e-secret';
  process.env.TENANTS_FILE = T;
  process.env.LEADS_FILE = L;
  delete process.env.VERCEL;

  await writeFile(T, JSON.stringify({ key: 'glow', vertical: 'clinic', accessToken: 'RIGHTKEY', config: { displayName: 'Glow Clinic' } }) + '\n');

  const { newLead } = await import('../api/_leads.js');
  await newLead({ tenant_key: 'glow', name: 'Meera', message: 'hair transplant' });
  await newLead({ tenant_key: 'glow', name: 'Ravi', message: 'skin' });
  await newLead({ tenant_key: 'acme', name: 'SecretCorp lead', message: 'do not leak me' });

  sessionHandler = (await import('../api/session.js')).default;
  leadsHandler = (await import('../api/leads.js')).default;
});
after(async () => { await rm(T, { force: true }); await rm(L, { force: true }); });

test('a wrong key is refused with no hint', async () => {
  const res = mkRes();
  await sessionHandler({ method: 'POST', body: { key: 'glow.WRONG' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error, 'That key is not valid.'); // same message for every failure
  assert.ok(!res.headers['Set-Cookie'], 'no session on a bad key');
});

test('an unknown tenant fails exactly like a wrong key', async () => {
  const res = mkRes();
  await sessionHandler({ method: 'POST', body: { key: 'ghost.RIGHTKEY' } }, res);
  assert.equal(res.statusCode, 401);
});

test('the right key issues a session cookie', async () => {
  const res = mkRes();
  await sessionHandler({ method: 'POST', body: { key: 'glow.RIGHTKEY' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.ok(cookieFrom(res).startsWith('ls_session='), 'cookie set');
});

test('the leads endpoint refuses a request with no session', async () => {
  const res = mkRes();
  await leadsHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('a valid session returns only its own tenant leads', async () => {
  const login = mkRes();
  await sessionHandler({ method: 'POST', body: { key: 'glow.RIGHTKEY' } }, login);
  const cookie = cookieFrom(login);

  const res = mkRes();
  await leadsHandler({ method: 'GET', headers: { cookie } }, res);
  assert.equal(res.statusCode, 200);
  const names = res.body.leads.map((l) => l.name);
  assert.ok(names.includes('Meera') && names.includes('Ravi'));
  assert.ok(!names.some((n) => /SecretCorp/.test(n)), 'another tenant\'s lead must never appear');
  assert.equal(res.body.stats.total, 2);
});

test('logout clears the cookie', async () => {
  const res = mkRes();
  await sessionHandler({ method: 'DELETE' }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(String(res.headers['Set-Cookie']).includes('Max-Age=0'));
});
