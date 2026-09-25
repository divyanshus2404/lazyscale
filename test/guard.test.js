// The admin endpoints hand back customers' names, addresses and messages. The
// only thing in front of them is one secret, so both ways of breaking a secret
// are worth a test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { secretMatches, tooMany, callerKey, adminGuard } from '../api/_guard.js';

test('the right secret matches and a wrong one does not', () => {
  assert.equal(secretMatches('hunter2', 'hunter2'), true);
  assert.equal(secretMatches('hunter3', 'hunter2'), false);
  assert.equal(secretMatches('hunter2 ', 'hunter2'), false);
});

test('an unset secret refuses everything, including an empty guess', () => {
  // Closed, never open. An endpoint that defaults to public hands a stranger a
  // client's entire enquiry history.
  assert.equal(secretMatches('', ''), false);
  assert.equal(secretMatches('', undefined), false);
  assert.equal(secretMatches('anything', ''), false);
});

test('comparison does not exit early on the first wrong character', () => {
  // A near-miss and a total miss of the same length must both be compared in
  // full, which is what stops a secret being recovered one character at a time.
  const secret = 'a'.repeat(32);
  assert.equal(secretMatches('a'.repeat(31) + 'b', secret), false);
  assert.equal(secretMatches('b'.repeat(32), secret), false);
});

test('a burst from one caller is cut off within one process', () => {
  const key = 'test-burst-' + Math.random();
  let blocked = 0;
  for (let i = 0; i < 12; i++) if (tooMany(key, 10, 60000)) blocked++;
  assert.equal(blocked, 2, 'the eleventh and twelfth should be refused');
});

test('one caller being throttled does not throttle another', () => {
  const a = 'caller-a-' + Math.random();
  const b = 'caller-b-' + Math.random();
  for (let i = 0; i < 10; i++) tooMany(a, 10, 60000);
  assert.equal(tooMany(a, 10, 60000), true);
  assert.equal(tooMany(b, 10, 60000), false);
});

test('the caller is identified by the forwarded address', () => {
  assert.equal(callerKey({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } }), '203.0.113.9');
  assert.equal(callerKey({ headers: {}, socket: { remoteAddress: '198.51.100.2' } }), '198.51.100.2');
  assert.equal(callerKey({ headers: {} }), 'unknown');
});

test('the guard refuses a wrong secret and passes the right one', () => {
  const before = process.env.ADMIN_SECRET;
  process.env.ADMIN_SECRET = 'correct-horse';
  try {
    const req = (s) => ({ headers: { 'x-forwarded-for': 'ip-' + Math.random() }, query: { s } });
    assert.equal(adminGuard(req('wrong')).status, 403);
    assert.equal(adminGuard(req('correct-horse')), null);
  } finally {
    if (before === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = before;
  }
});

// In-process only. Through `vercel dev` every request is a new process, so 70
// guesses there return 403 and never 429 — verified. Production keeps state on
// a warm instance and loses it on a cold start.
test('the rate limit is checked before the secret, so guessing costs the budget', () => {
  const before = process.env.ADMIN_SECRET;
  process.env.ADMIN_SECRET = 'correct-horse';
  try {
    const ip = 'guesser-' + Math.random();
    const req = (s) => ({ headers: { 'x-forwarded-for': ip }, query: { s } });
    let last;
    for (let i = 0; i < 70; i++) last = adminGuard(req('guess-' + i));
    assert.equal(last.status, 429, 'a guessing run must hit the limit, not 403 forever');
  } finally {
    if (before === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = before;
  }
});
