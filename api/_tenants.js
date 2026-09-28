// A tenant, and the config every other part of LazyScale reads from it.
//
// This is the keystone. Until now behaviour was hardcoded: one prompt in
// lead.js, one follow-up cadence in tick.js, one set of rules. That makes one
// customer possible and two customers a fork. A tenant fixes that: each business
// is a row with a config, and the qualifier, the follow-up engine and the
// guardrails all read the config rather than a constant.
//
// Adding a vertical (clinic, IVF, property) is then a template pack, not code.
// Onboarding a customer is: create a tenant, pick a pack, override what differs.
//
// Config resolution is pure and tested. The store half mirrors _leads.js: local
// file on a laptop, Supabase in production, never throws.
//
// Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. TENANTS_FILE overrides
// the local path for tests.

// ── base config: the safe defaults every tenant starts from ──────────────────
const BASE = {
  vertical: 'general',
  displayName: 'LazyScale',
  // What the qualifier is told it is. Packs append their own domain guardrails.
  role: 'the first responder for a small business. A new enquiry has arrived.',
  // Extracted from every enquiry. Packs add domain fields.
  qualifyingFields: [
    { key: 'intent', label: 'What they want' },
    { key: 'timeline', label: 'How soon' },
    { key: 'contact', label: 'Name and contact' }
  ],
  // Lines the reply must never cross. Packs add to this; they never remove.
  neverDo: [
    'invent a price, a discount, or a delivery date you were not given',
    'promise anything you cannot be certain of'
  ],
  // What forces a human. Packs extend it.
  escalateOn: ['complaint', 'refund', 'price negotiation', 'existing order or account'],
  followUp: {
    scheduleHours: [24, 72, 120, 168],
    quiet: { startHour: 21, endHour: 9 },
    tzOffsetMinutes: 330 // IST
  },
  consentLine: '',
  caps: { modelDaily: 300, emailDaily: 90 }
};

// ── template packs: one per vertical, merged over BASE ────────────────────────
// A pack only states what differs. neverDo / escalateOn / qualifyingFields are
// ADDED to the base, never replaced, so a pack can tighten safety but not loosen
// it. Everything else overrides.
const PACKS = {
  general: {},

  // Healthcare. The guardrail here is not decoration: the assistant must never
  // behave like a clinician, and patient enquiries are sensitive data.
  clinic: {
    vertical: 'clinic',
    role: 'the front desk for a clinic. A new patient enquiry has arrived. Your only jobs are to understand what they are asking for, capture their contact, and either help them book or hand them to a human.',
    qualifyingFields: [
      { key: 'service', label: 'Treatment or service asked about' },
      { key: 'timeline', label: 'When they want it' }
    ],
    neverDo: [
      'give a diagnosis, or any medical or clinical opinion',
      'say whether a treatment or procedure is suitable, safe or right for them',
      'quote a medical outcome, success rate, or recovery detail',
      'quote a price for a procedure'
    ],
    escalateOn: ['any clinical or medical question', 'anything about an existing patient or treatment'],
    consentLine: 'By replying you agree we may store your details to respond to your enquiry. Reply STOP to opt out at any time.'
  },

  // IVF and fertility: clinic rules, higher sensitivity, stronger consent.
  ivf: {
    vertical: 'ivf',
    role: 'the coordinator for a fertility clinic. A new enquiry has arrived. Respond warmly and briefly, capture their contact, and hand anything clinical to a human. This is an emotional decision for the patient; never sound like a script.',
    qualifyingFields: [
      { key: 'service', label: 'Treatment asked about' },
      { key: 'timeline', label: 'When they want to start' }
    ],
    neverDo: [
      'give any medical or clinical opinion, or a diagnosis',
      'quote success rates, odds, or outcomes',
      'say whether treatment is suitable for them',
      'quote a price'
    ],
    escalateOn: ['any clinical or medical question', 'anything about an existing patient or cycle'],
    consentLine: 'By replying you agree we may store your details to respond to your enquiry. Reply STOP to opt out at any time.'
  },

  // Real estate developers / brokers.
  property: {
    vertical: 'property',
    role: 'the first responder for a property developer. A new enquiry has arrived. Understand what they are looking for, capture their contact, and either answer simply or hand a serious buyer to the sales team.',
    qualifyingFields: [
      { key: 'requirement', label: 'What they want (type, size)' },
      { key: 'location', label: 'Preferred location' },
      { key: 'budget', label: 'Budget' },
      { key: 'timeline', label: 'How soon' }
    ],
    neverDo: [
      'commit to a price or a discount',
      'promise availability or a possession date you were not given'
    ]
  }
};

const uniq = (arr) => [...new Set(arr)];

/**
 * Resolve a tenant's effective config: BASE, then the vertical pack, then the
 * tenant's own overrides. Additive fields (neverDo, escalateOn,
 * qualifyingFields) accumulate so a pack can only make safety stricter. Pure.
 *
 * @param {object} tenant  a tenant row: { vertical, config, ... }
 */
export function resolveTenantConfig(tenant = {}) {
  const pack = PACKS[tenant.vertical] || PACKS.general;
  const over = tenant.config || {};

  const merged = { ...BASE, ...pack, ...over };

  // Additive, base first, then pack, then any tenant extras.
  merged.neverDo = uniq([...BASE.neverDo, ...(pack.neverDo || []), ...(over.neverDo || [])]);
  merged.escalateOn = uniq([...BASE.escalateOn, ...(pack.escalateOn || []), ...(over.escalateOn || [])]);

  // Qualifying fields: a pack replaces the base set (its fields are the domain
  // ones), tenant extras append. Deduped by key.
  const fieldSource = over.qualifyingFields || pack.qualifyingFields || BASE.qualifyingFields;
  const seen = new Set();
  merged.qualifyingFields = fieldSource.filter((f) => (seen.has(f.key) ? false : seen.add(f.key)));

  merged.followUp = { ...BASE.followUp, ...(pack.followUp || {}), ...(over.followUp || {}) };
  merged.caps = { ...BASE.caps, ...(pack.caps || {}), ...(over.caps || {}) };
  merged.vertical = tenant.vertical || 'general';

  return merged;
}

/**
 * The system prompt for the qualifier, built from the resolved config. This is
 * what replaces the hardcoded prompt in lead.js: the same code serves every
 * vertical, the differences all come from the tenant.
 */
export function buildSystemPrompt(cfg) {
  const fields = cfg.qualifyingFields.map((f) => `- ${f.label}`).join('\n');
  const never = cfg.neverDo.map((n) => `- ${n}`).join('\n');
  const escalate = cfg.escalateOn.map((e) => `- ${e}`).join('\n');
  const name = cfg.displayName && cfg.displayName !== 'LazyScale' ? cfg.displayName : null;
  return [
    `You are ${cfg.role}`,
    name ? `You are answering on behalf of ${name}. You do not know ${name}'s prices, so if asked, say a person will confirm.` : '',
    '',
    'Do three things and return ONLY a JSON object.',
    '',
    '1. SCORE it 0-10 on how likely it is to become real business. Be honest; most enquiries are not a 9.',
    '',
    '2. EXTRACT what you can:',
    fields,
    '',
    '3. DECIDE if a person must handle it. Set needs_human true for any of:',
    escalate,
    '- they explicitly ask for a human',
    '- you are not confident you can answer well',
    '',
    'Then DRAFT the first reply, unless needs_human is true, in which case leave it empty.',
    '',
    'Never, in any reply:',
    never,
    '',
    'Reply in Indian English, 60-120 words, no emoji, one clear next step.',
    'Return exactly: {"score":<0-10>,"summary":"<=15 words","intent":"<short>","needs_human":<bool>,"escalation_reason":"<short or empty>","reply":"<body or empty>"}'
  ].join('\n');
}

export const VERTICALS = Object.keys(PACKS);

// ── store ────────────────────────────────────────────────────────────────────
const TABLE = 'tenants';
const LOCAL_FILE = () => process.env.TENANTS_FILE || '.local-tenants.jsonl';
const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const useLocalFile = () => !process.env.VERCEL && !configured();

/** Fetch a tenant by key, already resolved. Falls back to a general tenant so a
 *  missing config never takes down capture. */
export async function getTenant(tenantKey) {
  const row = await loadRow(tenantKey);
  const tenant = row || { key: tenantKey, vertical: 'general', config: {} };
  return { ...tenant, resolved: resolveTenantConfig(tenant) };
}

/**
 * Which tenant a signed-in person belongs to, by email. This is the user ->
 * business link: OAuth tells us who someone is, this says whose leads they may
 * see. A tenant lists its people in `ownerEmail` or `members` (an array of
 * emails). Returns the tenant key, or null if the email is linked to nobody.
 */
export async function tenantKeyForEmail(email) {
  if (!email) return null;
  const needle = String(email).toLowerCase();
  const match = (row) =>
    String(row.ownerEmail || '').toLowerCase() === needle ||
    (Array.isArray(row.members) && row.members.some((m) => String(m).toLowerCase() === needle));

  if (useLocalFile()) {
    try {
      const { readFile } = await import('node:fs/promises');
      let text = '';
      try { text = await readFile(LOCAL_FILE(), 'utf8'); } catch { return null; }
      const row = text.split('\n').filter(Boolean)
        .map((l) => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean).find(match);
      return row ? row.key : null;
    } catch { return null; }
  }
  if (!configured()) return null;
  // owner match first (cheap), then array-contains on members.
  const base = process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + TABLE;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const get = async (qs) => {
    try {
      const res = await fetch(base + '?' + qs, { headers });
      if (!res.ok) return null;
      const rows = await res.json().catch(() => []);
      return rows?.[0]?.key || null;
    } catch { return null; }
  };
  return (await get(new URLSearchParams({ ownerEmail: 'eq.' + needle, select: 'key', limit: '1' })))
      || (await get('members=cs.' + encodeURIComponent(JSON.stringify([needle])) + '&select=key&limit=1'));
}

async function loadRow(tenantKey) {
  if (useLocalFile()) {
    try {
      const { readFile } = await import('node:fs/promises');
      let text = '';
      try { text = await readFile(LOCAL_FILE(), 'utf8'); } catch { return null; }
      return text.split('\n').filter(Boolean)
        .map((l) => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean).find((r) => r.key === tenantKey) || null;
    } catch { return null; }
  }
  if (!configured()) return null;
  const url = process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + TABLE
    + '?' + new URLSearchParams({ key: 'eq.' + tenantKey, select: '*', limit: '1' });
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => []);
    return rows?.[0] || null;
  } catch { return null; } finally { clearTimeout(timer); }
}
