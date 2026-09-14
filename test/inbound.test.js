// The drop-in's pure helpers. Each case here is something that either broke or
// would have been expensive to get wrong: a duplicate slipping through, a form
// field silently dropped, an origin check that lets anyone post.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintOf, originAllowed, pick, extras, FIELDS } from '../api/inbound.js';

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
