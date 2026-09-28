// Watch the follow-up engine work. Real store, real processor, time fast-forwarded.
//   node scripts/followup-demo.mjs
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';

const FILE = join(tmpdir(), `ls-demo-${Date.now()}.jsonl`);
process.env.LEADS_FILE = FILE;
delete process.env.VERCEL;

const { newLead, getLead, patchLead } = await import('../api/_leads.js');
const { runTick } = await import('../api/tick.js');

const START = new Date('2026-03-02T05:00:00.000Z');
const at = (d) => new Date(START.getTime() + d * 86400e3);
const day = (d) => `day ${String(d).padStart(2)}`;

console.log('\n  A lead arrives on WhatsApp. We never touch it after it answers.\n');
const { lead } = await newLead({
  tenant_key: 'acme', name: 'Rahul', channel: 'whatsapp',
  message: '3BHK in Whitefield, 1.2cr, need it in 2 months', score: 9,
  created_at: START.toISOString(), sequence_start_at: START.toISOString()
});
console.log(`  captured  ${lead.name}  ·  ${lead.channel}  ·  "${lead.message}"\n`);

for (const d of [0, 1, 3, 5]) {
  const r = await runTick(at(d));
  const a = r.actions.find((x) => x.id === lead.id);
  if (a.action === 'follow_up') {
    const row = await getLead(lead.id);
    console.log(`  ${day(d)}   chase ${a.attempt}/${a.of}  →  "${row.last_draft}"`);
  } else {
    console.log(`  ${day(d)}   wait, next chase ${a.until?.slice(5, 16).replace('T', ' ')}`);
  }
}

console.log(`\n  Rahul replies on day 6. The engine stops.\n`);
await patchLead(lead.id, { status: 'engaged', replied: true, last_inbound_at: at(6).toISOString() });
const r = await runTick(at(7));
console.log(`  ${day(7)}   ${r.actions.find((x) => x.id === lead.id) ? 'chased again' : 'left alone — a person has the conversation now'}\n`);

await rm(FILE, { force: true });
