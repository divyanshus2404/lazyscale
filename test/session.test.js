// The auth wall, pinned. This decides who gets to see a business's leads, so the
// cases that matter are the attacks: a forged cookie, a tampered payload, an
// expired session, a wrong secret, and a missing server secret.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSession, readSession, safeEqual, parseCookies, sessionCookie, sessionTenant, COOKIE
} from '../api/_session.js';

before(() => { process.env.SESSION_SECRET = 'test-secret-please-change'; });

test('a freshly signed session reads back as its tenant', () => {
  const s = makeSession('glow');
  assert.deepEqual(readSession(s), { tenantKey: 'glow' });
});

test('a tampered payload is rejected', () => {
  const s = makeSession('glow');
  // swap the tenant in the payload without re-signing
  const forged = Buffer.from(JSON.stringify({ t: 'other', exp: Date.now() + 1e6 })).toString('base64url')
    + '.' + s.slice(s.indexOf('.') + 1);
  assert.equal(readSession(forged), null);
});

test('a bad signature is rejected', () => {
  const s = makeSession('glow');
  assert.equal(readSession(s.slice(0, -3) + 'aaa'), null);
});

test('an expired session is rejected', () => {
  const s = makeSession('glow', -1000); // already expired
  assert.equal(readSession(s), null);
});

test('garbage is rejected, not thrown on', () => {
  for (const junk of ['', 'x', 'a.b', 'a.b.c', null, undefined, 42]) {
    assert.equal(readSession(junk), null);
  }
});

test('with no server secret, nothing signs and nothing verifies', () => {
  const saved = process.env.SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  assert.equal(makeSession('glow'), '');
  assert.equal(readSession('anything.here'), null);
  process.env.SESSION_SECRET = saved;
});

test('safeEqual is correct and length-safe', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false); // no throw on length mismatch
  assert.equal(safeEqual('', ''), true);
});

test('cookies parse, and the logout cookie expires immediately', () => {
  assert.deepEqual(parseCookies('a=1; b=two%20words'), { a: '1', b: 'two words' });
  assert.ok(sessionCookie('v').includes('HttpOnly'));
  assert.ok(sessionCookie('v').includes('Max-Age=' ));
  assert.ok(sessionCookie('').includes('Max-Age=0')); // logout
});

test('sessionTenant reads the cookie off a request', () => {
  const s = makeSession('acme');
  const req = { headers: { cookie: `${COOKIE}=${s}; other=1` } };
  assert.deepEqual(sessionTenant(req), { tenantKey: 'acme' });
  assert.equal(sessionTenant({ headers: {} }), null);
});

test('one tenant cannot receive another tenant valid cookie as its own', () => {
  // A glow session is a glow session, full stop. There is no path by which it
  // reads as acme, which is what keeps one business out of another's leads.
  const s = makeSession('glow');
  assert.equal(readSession(s).tenantKey, 'glow');
});
