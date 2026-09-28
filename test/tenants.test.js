// The tenant config layer, pinned. This is the keystone the whole product hangs
// off, so the rules that matter are here: packs override behaviour, safety is
// only ever added and never removed, and the healthcare guardrail is present and
// enforced in the built prompt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTenantConfig, buildSystemPrompt, VERTICALS
} from '../api/_tenants.js';

test('an unknown vertical falls back to the safe general config', () => {
  const cfg = resolveTenantConfig({ vertical: 'nope' });
  assert.equal(cfg.vertical, 'nope');
  assert.ok(cfg.neverDo.length >= 2);
  assert.ok(cfg.followUp.scheduleHours.length === 4);
});

test('a pack overrides behaviour but the base safety rules still apply', () => {
  const cfg = resolveTenantConfig({ vertical: 'property' });
  // base neverDo (no invented price/date) survives alongside the pack's own
  assert.ok(cfg.neverDo.some((n) => /invent a price/.test(n)));
  assert.ok(cfg.neverDo.some((n) => /possession date/.test(n)));
  // property fields replaced the generic ones
  assert.ok(cfg.qualifyingFields.some((f) => f.key === 'budget'));
});

test('the clinic pack forbids acting like a clinician', () => {
  const cfg = resolveTenantConfig({ vertical: 'clinic' });
  const joined = cfg.neverDo.join(' | ').toLowerCase();
  assert.ok(joined.includes('diagnosis'), 'no diagnosis');
  assert.ok(joined.includes('suitable'), 'no suitability claims');
  assert.ok(joined.includes('price'), 'no price for a procedure');
  assert.ok(cfg.escalateOn.some((e) => /clinical|medical/.test(e)), 'clinical questions escalate');
  assert.ok(cfg.consentLine.includes('STOP'), 'consent + opt-out line present');
});

test('the healthcare guardrail reaches the actual prompt, not just config', () => {
  const cfg = resolveTenantConfig({ vertical: 'clinic' });
  const prompt = buildSystemPrompt(cfg);
  assert.ok(/diagnosis/i.test(prompt));
  assert.ok(/suitable/i.test(prompt));
  assert.ok(/clinical or medical question/i.test(prompt));
  assert.ok(/ONLY a JSON object/.test(prompt));
});

test('ivf inherits the clinical guardrail and adds outcome rules', () => {
  const cfg = resolveTenantConfig({ vertical: 'ivf' });
  const joined = cfg.neverDo.join(' | ').toLowerCase();
  assert.ok(joined.includes('success rates') || joined.includes('outcomes'));
  assert.ok(joined.includes('diagnosis'));
});

test('a tenant can override its own config, but cannot loosen safety', () => {
  const cfg = resolveTenantConfig({
    vertical: 'clinic',
    config: {
      displayName: 'Glow Skin Clinic',
      followUp: { scheduleHours: [2, 24] },
      neverDo: ['mention competitor clinics']   // adds, does not replace
    }
  });
  assert.equal(cfg.displayName, 'Glow Skin Clinic');
  assert.deepEqual(cfg.followUp.scheduleHours, [2, 24]);
  // the tenant addition is there
  assert.ok(cfg.neverDo.includes('mention competitor clinics'));
  // and the clinic guardrail is STILL there, not overwritten
  assert.ok(cfg.neverDo.some((n) => /diagnosis/.test(n)));
});

test('tenant overrides win on scalar fields', () => {
  const cfg = resolveTenantConfig({ vertical: 'property', config: { caps: { modelDaily: 1000 } } });
  assert.equal(cfg.caps.modelDaily, 1000);
  assert.equal(cfg.caps.emailDaily, 90); // untouched base value
});

test('follow-up config merges base quiet hours with a pack schedule', () => {
  const cfg = resolveTenantConfig({ vertical: 'clinic' });
  assert.equal(cfg.followUp.quiet.startHour, 21);
  assert.equal(cfg.followUp.tzOffsetMinutes, 330);
});

test('every declared vertical resolves without throwing', () => {
  for (const v of VERTICALS) {
    const cfg = resolveTenantConfig({ vertical: v });
    assert.ok(buildSystemPrompt(cfg).length > 100, `${v} builds a prompt`);
  }
});

test('the built prompt always demands the strict JSON shape', () => {
  const prompt = buildSystemPrompt(resolveTenantConfig({ vertical: 'general' }));
  assert.ok(/"score"/.test(prompt));
  assert.ok(/"needs_human"/.test(prompt));
  assert.ok(/"reply"/.test(prompt));
});
