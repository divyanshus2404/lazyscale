# The Automation Diagnostic — ₹2,999

The rung between the free audit and a retainer. Someone who pays ₹2,999 is a
different prospect from someone who fills in a form, and this is the only thing
on the site that earns without spending your calendar first.

**Sold as:** a written diagnostic, delivered in 3 working days.
**Credited in full** against the setup fee if they go ahead.
**Refunded in full** if they say within 7 days that it was not useful.

---

## Why it is priced at ₹2,999

Low enough that a founder decides alone, without a procurement conversation.
High enough that nobody buys it idly. The number is doing qualification work,
not revenue work — treat the revenue as incidental.

**Do not discount it.** The moment it is negotiable it stops filtering, which is
the only reason it exists.

---

## What the buyer actually gets

One document, written for them, containing:

1. **Every repetitive process, mapped and ranked** by hours per month — not by
   how interesting it is to automate.
2. **The three to automate first**, with a realistic estimate of hours saved and
   what each would cost to build.
3. **What not to automate, and why.** Usually the most valuable page. It is the
   one that saves them money, and it is what makes the document feel honest.
4. **A fixed quote** for anything they want built.

Template: [`diagnostic-report-template.md`](diagnostic-report-template.md).

---

## Delivery

### Step 1 — the six questions (sent immediately on payment)

Keep it to six. A long form gets abandoned and you can chase detail on the call.

1. What does your business do, and roughly how many people are in the team?
2. Which tools does the team live in every day? (WhatsApp, Gmail, Excel, Tally,
   a CRM — list whatever is actually open.)
3. Where does work pile up or get dropped? Be specific about the moment it
   happens.
4. Roughly how many enquiries, orders or tickets do you handle in a week?
5. What is the last thing that fell through the cracks and cost you money?
6. If you could hand one recurring task to someone tomorrow, what would it be?

### Step 2 — the 45-minute call

**Get examples, not descriptions.** "We follow up with leads" is useless. "Here
are the last three enquiries and what happened to each" is the whole diagnostic.

Ask for three real recent cases and walk each one end to end. Note who touches
it, what they retype, and where it waits.

### Step 3 — write it

Half a day. Do not exceed one day — at ₹2,999 the economics only work as a fast,
templated, genuinely useful document, and the value is in the ranking and the
refusals, not in length.

---

## Boundaries

- **It is a diagnostic, not a build.** No workflow is created, no tool is
  connected, no credential is touched.
- **No access to their systems.** If you need to see inside a tool, that is a
  screen-share on the call, not a login.
- **The document is theirs**, including if they take it to another agency. Say
  this up front — it is what makes the ₹2,999 feel fair, and refusing to say it
  makes you sound like you are trapping them.
- **The same refusals apply** as everywhere else. If the diagnostic concludes
  the honest answer is cold outbound or scraping behind a login, write that it
  should not be built. See [`README.md`](README.md).

---

## When to refund without arguing

Any of these, immediately and without asking why:

- They say it was not useful, within 7 days.
- You could not find enough recurring work to fill the ranking honestly.
- The real answer was "hire a person" or "fix the process first, then talk
  about automation."

The third one will happen. **Write it plainly, refund, and say so** — that is
the reputation you want in a market where every agency claims everything is
automatable. A refunded honest diagnostic is a better referral source than a
retainer sold to someone who did not need it.

---

## Wiring the payment

The site button is in the `#diagnostic` section. Until a Razorpay link exists it
books a call instead of pointing at a dead checkout.

To switch it on, create a Razorpay **Payment Link** for ₹2,999 and paste it into
`DIAGNOSTIC_PAY_URL` near the bottom of `index.html`:

```js
const DIAGNOSTIC_PAY_URL = 'https://rzp.io/l/xxxxxxxx';
```

The button then reads "Pay ₹2,999 and start" and goes straight to checkout.

Set the Razorpay link to collect **name, email and phone**, and enable the
receipt email — that is your intake, so you are not chasing details afterwards.

**GST:** if you are registered, the ₹2,999 should be inclusive and the invoice
must show the split. If you are not yet registered, say "₹2,999" with no tax
line rather than inventing one. See the invoicing tools in
[`../ROADMAP.md`](../ROADMAP.md).
