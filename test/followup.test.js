// The follow-up engine's rules, pinned. This is the product's core decision, so
// every branch is here: what stops a sequence, when a chase is due, the cadence,
// exhaustion, and quiet hours.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planFollowUp, afterFollowUp, afterReply, DEFAULT_SCHEDULE_HOURS
} from '../api/_followup.js';

const HOUR = 3600 * 1000;
const START = '2026-01-01T06:00:00.000Z';           // a lead arrives at 6am UTC
const at = (h) => new Date(new Date(START).getTime() + h * HOUR);
const base = (over = {}) => ({ created_at: START, status: 'new', attempts: 0, ...over });

test('a fresh lead is not chased before the first interval', () => {
  const p = planFollowUp(base(), at(1));            // one hour in
  assert.equal(p.action, 'wait');
  assert.equal(p.attempt, 1);
  assert.equal(p.until, at(DEFAULT_SCHEDULE_HOURS[0]).toISOString());
});

test('the first chase becomes due exactly at +24h', () => {
  const p = planFollowUp(base(), at(24));
  assert.equal(p.action, 'follow_up');
  assert.equal(p.attempt, 1);
  assert.equal(p.of, DEFAULT_SCHEDULE_HOURS.length);
});

test('the cadence walks 1, 3, 5, 7 days as attempts accrue', () => {
  for (let i = 0; i < DEFAULT_SCHEDULE_HOURS.length; i++) {
    const due = DEFAULT_SCHEDULE_HOURS[i];
    const lead = base({ attempts: i });
    assert.equal(planFollowUp(lead, at(due - 1)).action, 'wait', `attempt ${i + 1} not due yet`);
    const now = planFollowUp(lead, at(due));
    assert.equal(now.action, 'follow_up', `attempt ${i + 1} due`);
    assert.equal(now.attempt, i + 1);
  }
});

test('after the last scheduled chase the sequence is exhausted, not looping', () => {
  const lead = base({ attempts: DEFAULT_SCHEDULE_HOURS.length });
  const p = planFollowUp(lead, at(1000));
  assert.equal(p.action, 'stop');
  assert.equal(p.reason, 'exhausted');
});

test('a reply stops the sequence, even when a chase is due', () => {
  const p = planFollowUp(base({ attempts: 1, replied: true }), at(72));
  assert.deepEqual(p, { action: 'stop', reason: 'replied' });
});

test('an inbound message is treated as a reply', () => {
  const p = planFollowUp(base({ last_inbound_at: at(2).toISOString() }), at(48));
  assert.equal(p.reason, 'replied');
});

test('escalation stops the sequence: a person owns it now', () => {
  assert.equal(planFollowUp(base({ needs_human: true }), at(48)).reason, 'handed_to_human');
  assert.equal(planFollowUp(base({ status: 'handed_to_human' }), at(48)).reason, 'handed_to_human');
});

test('an opt-out stops the sequence and outranks everything', () => {
  const p = planFollowUp(base({ opted_out: true, attempts: 0 }), at(24));
  assert.equal(p.reason, 'opted_out');
});

test('won and lost are terminal', () => {
  assert.equal(planFollowUp(base({ status: 'won' }), at(24)).reason, 'won');
  assert.equal(planFollowUp(base({ status: 'lost' }), at(24)).reason, 'lost');
});

test('a lead with no usable start time stops rather than guessing', () => {
  const p = planFollowUp({ status: 'new', attempts: 0, created_at: 'not-a-date' }, at(24));
  assert.deepEqual(p, { action: 'stop', reason: 'no_start' });
});

test('sequence_start_at overrides created_at when present', () => {
  // Started the clock 10h after the row was created; first chase is 24h after
  // that, i.e. at +34h from created_at.
  const lead = base({ sequence_start_at: at(10).toISOString() });
  assert.equal(planFollowUp(lead, at(33)).action, 'wait');
  assert.equal(planFollowUp(lead, at(34)).action, 'follow_up');
});

test('a custom schedule is honoured end to end', () => {
  const opts = { scheduleHours: [2, 4] };
  assert.equal(planFollowUp(base(), at(1), opts).action, 'wait');
  assert.equal(planFollowUp(base(), at(2), opts).action, 'follow_up');
  assert.equal(planFollowUp(base({ attempts: 2 }), at(99), opts).reason, 'exhausted');
});

test('quiet hours push a night-time chase to the morning', () => {
  // Start at 8pm IST so +24h lands at 8pm the next day, inside 9pm-9am? No: 8pm
  // is before 9pm, so it is NOT quiet. Use a start that makes the due time land
  // at 2am IST instead.
  const startIST2am = '2026-01-01T18:30:00.000Z'; // 00:00 IST; +2h due = 02:00 IST
  const lead = { created_at: startIST2am, status: 'new', attempts: 0 };
  const opts = { scheduleHours: [2], quiet: { startHour: 21, endHour: 9 }, tzOffsetMinutes: 330 };
  const p = planFollowUp(lead, new Date(startIST2am), opts);
  assert.equal(p.action, 'wait');
  // Due raw is 20:30 UTC = 02:00 IST on Jan 2, which is in quiet hours, so it is
  // pushed to 09:00 IST that morning = 03:30 UTC on Jan 2.
  assert.equal(p.until, '2026-01-02T03:30:00.000Z');
});

test('quiet hours leave a daytime chase alone', () => {
  const opts = { scheduleHours: [24], quiet: { startHour: 21, endHour: 9 }, tzOffsetMinutes: 330 };
  // Start 6am UTC = 11:30 IST; +24h due = 11:30 IST next day, well inside the day.
  assert.equal(planFollowUp(base(), at(23), opts).action, 'wait');
  assert.equal(planFollowUp(base(), at(24), opts).action, 'follow_up');
});

test('afterFollowUp advances the attempt count and stamps the time', () => {
  const patch = afterFollowUp(base({ attempts: 1 }), at(24));
  assert.equal(patch.status, 'following_up');
  assert.equal(patch.attempts, 2);
  assert.equal(patch.last_attempt_at, at(24).toISOString());
});

test('afterReply records the inbound and marks the lead engaged', () => {
  const patch = afterReply(at(5));
  assert.equal(patch.status, 'engaged');
  assert.equal(patch.replied, true);
  assert.equal(patch.last_inbound_at, at(5).toISOString());
});

test('a non-object lead is handled, not thrown on', () => {
  assert.deepEqual(planFollowUp(null, at(1)), { action: 'stop', reason: 'no_lead' });
});
