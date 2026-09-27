// The money guard.
//
// The form endpoints are public, and every submission can trigger a paid Claude
// call. The per-request rate limit lives in one process's memory, so it resets
// on every serverless cold start and does NOT bound spend under a flood. This
// does: a hard ceiling on paid model calls per UTC day, counted in the store so
// it survives restarts and is shared across every serverless instance.
//
// It fails CLOSED. If the store cannot be reached to check the day's count, the
// model is skipped rather than risk an unmetered bill. The enquiry is still
// captured and the owner still alerted — only the auto-draft is skipped — so no
// lead is lost. The rule is: never spend money we cannot first prove is within
// budget.
//
// Set the ceiling with MODEL_DAILY_CAP (default 300). At roughly ₹0.30 a call,
// 300 is about ₹90 on the worst possible day. Set it to 0 to disable the paid
// model entirely and run capture-and-alert only, for free.

import { countAllSince } from './_store.js';

function startOfUtcDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export function dailyCap() {
  const raw = Number(process.env.MODEL_DAILY_CAP);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 300;
}

/**
 * May we make a paid model call right now?
 *
 * Returns { ok: true } only when we have counted the day's calls and are under
 * the ceiling. Every other outcome — cap of zero, count unavailable, ceiling
 * reached — returns ok:false with a reason, and the caller must skip the model.
 */
export async function modelBudgetOk() {
  const cap = dailyCap();
  if (cap === 0) return { ok: false, reason: 'model_disabled' };

  const used = await countAllSince(startOfUtcDay());
  if (used === null) return { ok: false, reason: 'budget_unknown' }; // fail closed
  if (used >= cap) return { ok: false, reason: 'daily_cap', used, cap };
  return { ok: true, used, cap };
}

/**
 * May we send an email right now? Same durable, fail-closed pattern as the model
 * cap. Even though the email tier is free with no card, this stops the code ever
 * hammering the provider or blowing a free daily allowance under a flood.
 *
 * EMAIL_DAILY_CAP defaults to 90, just under Resend's free 100-a-day. Set it to
 * 0 to stop sending entirely (enquiries are still captured; you read them in the
 * console).
 */
export function emailCap() {
  const raw = Number(process.env.EMAIL_DAILY_CAP);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 90;
}

export async function emailBudgetOk() {
  const cap = emailCap();
  if (cap === 0) return { ok: false, reason: 'email_disabled' };
  const used = await countAllSince(startOfUtcDay());
  if (used === null) return { ok: false, reason: 'budget_unknown' }; // fail closed
  if (used >= cap) return { ok: false, reason: 'email_cap', used, cap };
  return { ok: true, used, cap };
}
