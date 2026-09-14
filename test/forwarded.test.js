// Getting this wrong sends every reply back to the business that forwarded the
// enquiry instead of out to their customer — silently, every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksForwarded, originalSender, messageBody } from '../api/_forwarded.js';

const GMAIL = [
  '---------- Forwarded message ---------',
  'From: Priya Sharma <priya@example.com>',
  'Date: Mon, 14 Sep 2026 at 23:41',
  'Subject: Delivery to Indiranagar',
  'To: Shop <orders@shop.example>',
  '',
  'Do you deliver to Indiranagar? I need 30 chairs by Friday.'
].join('\n');

const OUTLOOK = [
  '________________________________',
  'From: Priya Sharma <priya@example.com>',
  'Sent: Monday 14 September 2026 23:41',
  'To: Shop <orders@shop.example>',
  'Subject: Delivery',
  '',
  'Do you deliver to Indiranagar?'
].join('\n');

test('a Gmail forward gives up the original sender', () => {
  assert.equal(looksForwarded(GMAIL), true);
  assert.equal(originalSender(GMAIL).email, 'priya@example.com');
});

test('an Outlook forward gives up the original sender', () => {
  assert.equal(originalSender(OUTLOOK).email, 'priya@example.com');
});

test('the quoted header is stripped from the message body', () => {
  const body = messageBody(GMAIL);
  assert.match(body, /30 chairs/);
  assert.equal(body.includes('Forwarded message'), false);
  assert.equal(body.includes('Subject:'), false);
});

test('an unparseable forward returns null rather than a guess', () => {
  // A wrong guess puts the client's own address in reply-to. Null lets the
  // caller fall back to the envelope, which is at least honest about it.
  assert.equal(originalSender('just a normal email, no forward header here'), null);
  assert.equal(originalSender(''), null);
});

test('plain mail is not mistaken for a forward', () => {
  assert.equal(looksForwarded('Hi, are you open on Sunday?'), false);
});
