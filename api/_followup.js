// The follow-up engine, decision half.
//
// This is the one piece of LazyScale that is genuinely the product rather than
// plumbing: given a lead and the current time, it decides the single next thing
// to do. Send the next chase, wait until a chase is due, or stop for good.
//
// It is deliberately pure. No database, no clock of its own, no network. That is
// what lets it be trusted: every rule below is covered by test/followup.test.js,
// it costs nothing to run, and the endpoint that does have side effects
// (api/tick.js, later) is a thin shell around this.
//
// The cadence: a lead that never replies is chased at +1, +3, +5 and +7 days
// from when the sequence started, then left alone. Four touches, because most
// leads that convert do so within a handful of follow-ups and past that it reads
// as pestering. Change DEFAULT_SCHEDULE_HOURS, or pass opts.scheduleHours, and
// every downstream count follows.

export const DEFAULT_SCHEDULE_HOURS = [24, 72, 120, 168];

const HOUR = 3600 * 1000;
const stop = (reason) => ({ action: 'stop', reason });
const ms = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());

// A lead is never chased once any of these are true. Checked before timing, so
// a due follow-up on an escalated or replied lead is dropped, not sent.
//
//   opted_out          they asked us to stop. Legally and decently, we stop.
//   won / lost         the outcome is settled.
//   needs_human /
//   handed_to_human    escalated. A person owns the conversation now.
//   replied            they answered. The sequence exists to get a reply; once
//                      it has one, chasing is the wrong move. A human takes over.
function terminalReason(lead) {
  if (lead.opted_out) return 'opted_out';
  if (lead.status === 'won') return 'won';
  if (lead.status === 'lost') return 'lost';
  if (lead.needs_human || lead.status === 'handed_to_human') return 'handed_to_human';
  if (lead.replied || lead.last_inbound_at) return 'replied';
  return null;
}

// Move a due time out of the small hours. A chase that lands at 2am waits until
// the morning, so we never message someone in the middle of the night. Off
// unless opts.quiet is given; times are computed in opts.tzOffsetMinutes (IST is
// 330) so "night" means night where the customer is, not on the server.
function applyQuietHours(due, opts) {
  const q = opts.quiet;
  if (!q) return due;
  const tz = Number(opts.tzOffsetMinutes || 0);
  const local = new Date(ms(due) + tz * 60 * 1000);
  const hour = local.getUTCHours();
  const start = q.startHour ?? 21;   // 9pm
  const end = q.endHour ?? 9;        // 9am
  const inQuiet = start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
  if (!inQuiet) return due;
  // Push to `end` o'clock: today if we are before it, tomorrow if after.
  const next = new Date(local);
  next.setUTCMinutes(0, 0, 0);
  if (hour >= end) next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(end);
  return new Date(ms(next) - tz * 60 * 1000);
}

/**
 * Decide the next action for one lead.
 *
 * @param {object} lead  a lead row. Reads: status, attempts, created_at,
 *                       sequence_start_at, replied, last_inbound_at, needs_human,
 *                       opted_out.
 * @param {Date|string|number} now  the moment to decide as of. Injected, never
 *                       read from the system clock, so tests are deterministic.
 * @param {object} opts  scheduleHours, quiet, tzOffsetMinutes.
 * @returns one of:
 *   { action: 'stop', reason }
 *   { action: 'wait', until: ISO, attempt }      not due yet
 *   { action: 'follow_up', attempt, of }         due now, send chase `attempt`
 */
export function planFollowUp(lead, now = new Date(), opts = {}) {
  if (!lead || typeof lead !== 'object') return stop('no_lead');

  const term = terminalReason(lead);
  if (term) return stop(term);

  const schedule = opts.scheduleHours || DEFAULT_SCHEDULE_HOURS;
  const attempts = Number(lead.attempts || 0);
  if (attempts >= schedule.length) return stop('exhausted');

  const startMs = ms(lead.sequence_start_at || lead.created_at);
  if (!Number.isFinite(startMs)) return stop('no_start');

  const due = applyQuietHours(new Date(startMs + schedule[attempts] * HOUR), opts);
  const attempt = attempts + 1;

  if (ms(now) < due.getTime()) {
    return { action: 'wait', until: due.toISOString(), attempt };
  }
  return { action: 'follow_up', attempt, of: schedule.length };
}

/**
 * The patch to persist after a chase is actually sent. Keeping this here, beside
 * the rule that scheduled the send, is what stops the two drifting apart.
 */
export function afterFollowUp(lead, at = new Date()) {
  return {
    status: 'following_up',
    attempts: Number(lead.attempts || 0) + 1,
    last_attempt_at: new Date(ms(at)).toISOString()
  };
}

/** The patch to persist when the customer replies. Ends the sequence. */
export function afterReply(at = new Date()) {
  return { status: 'engaged', replied: true, last_inbound_at: new Date(ms(at)).toISOString() };
}
