# LazyScale — roadmap and stack

Where this actually is, how it makes money, and what to run at each stage.

Written 21 August 2026. Current state: **83 commits, 3 automations built, 0 clients,
0 automations live.** Everything below is ordered to change the last two numbers.

---

## 1. What LazyScale is

**A managed service, not software.** Clients pay monthly for an outcome — every
inbound enquiry answered, qualified and routed — and we run the machinery. They never
touch n8n, prompts or dashboards.

Sold as **AI employees**: a role with a job description, an onboarding, a probation
period and a monthly performance review. That framing is the differentiator, and it
only holds if the delivery discipline matches it.

**What we sell today**

| Role | Price | Status |
|---|---|---|
| Lead Responder | ₹9,999/mo | Built (`api/lead.js`), not live |
| WhatsApp Agent | ₹9,999/mo | n8n template built, no BSP account |
| Collections Clerk | ₹9,999/mo | Spec only |
| Onboarding Coordinator | ₹6,999/mo | Spec only |
| Voice (inbound) | — | Not started. See phase 3. |

---

## 2. Why it does not make money yet

Three reasons, in order of how much they cost you:

**a. Nothing is live.** Three automations are built, tested and switched off, waiting
on one Anthropic key. Until that is done, the site describes a product that cannot be
demonstrated.

**b. The site cannot take money.** The only outbound links are Cal.com and WhatsApp.
Three prices are displayed and there is no way to pay any of them. Every path routes
through your calendar, so **revenue is capped by how many calls you can take**.

**c. There is no rung between free and ₹15k/month.** A visitor goes from a free audit
straight to a retainer that requires a sales call. Most people will not make that jump
from an unknown vendor.

---

## 3. The money model

### The ladder

```
Free audit          ₹0          proves the product, captures the lead
      ↓
Paid diagnostic     ₹2,999      buyable in 60 seconds, no call needed
      ↓
First workflow      ₹15,000     setup, one channel, live in 48 hours
      ↓
Retainer            ₹9,999+/mo  running, tuned, reviewed monthly
      ↓
Second workflow     +₹5,000/mo  expansion into the same client
```

**The paid diagnostic is the missing piece.** It earns without your time, and it
qualifies far harder than a form — someone who pays ₹2,999 is a different prospect
from someone who fills in a free form. It is also the natural bridge into the retainer.

### Pricing, honestly

₹4,999 was too low for something replacing a ₹35–50k desk. It read as a script rather
than an employee, and it attracted people who haggle. **Raised on 21 August 2026:**

| | Was | Now |
|---|---|---|
| Entry retainer | ₹4,999 | **₹9,999** |
| Standard | ₹14,999 | **₹19,999** |
| High volume | ₹39,999 | ₹39,999 |
| Setup (one-off) | — | **₹15,000** |

The setup fee is the more important half. It pays for the two days of build that used
to be free, and a client who has paid for a setup does not churn in month two.

Five clients at ₹4,999 is ₹25,000/month. Five clients at ₹20,000 is ₹1,00,000/month.
Same five clients, same work. **Pricing is the largest unclaimed lever here** and it
costs nothing to pull.

### What actually caps revenue

Your hours. After templates, a client is roughly 2 days to build and 2 hours a month
to maintain. That puts a realistic solo ceiling around **10–15 clients**, or
₹1.5–3L/month. Beyond that you either raise prices, hire, or productise.

---

## 4. Roadmap

### Phase 0 — make it real (this week)

Nothing here is new building. It is switching on what exists.

- [ ] Anthropic API key in Vercel, **with a monthly spend cap set first**
- [ ] Resend key + `OWNER_EMAIL`
- [ ] Enable Vercel Web Analytics (one toggle)
- [ ] Test the audit and the interview end to end
- [x] Fix the accessibility issues — done 21 Aug 2026 (doctype, lang, contrast tokens, heading order)
- [ ] Razorpay account, and a payment link for the paid diagnostic
      (the section is built and live; paste the link into `DIAGNOSTIC_PAY_URL`)
- [ ] Start the WhatsApp Business API application — it takes weeks, so start it now

**Exit:** the site demonstrates the product and can take a payment.

### Phase 1 — first three clients (weeks 1–8)

- [ ] n8n self-hosted on Railway or Render
- [ ] Three founding builds, traded for baseline numbers and a testimonial
- [ ] Job description sent **before** each build
- [ ] Shadow run 2–3 days on every one
- [ ] First monthly performance review written
- [ ] First case study published, with real numbers

**Exit:** one sentence you can say to a stranger — *"we cut X's first response from
four hours to ninety seconds, and here is the client's name."*

### Phase 2 — get paid properly (months 2–6)

- [ ] Raise prices. The case study is what lets you.
- [ ] Razorpay Subscriptions for retainers instead of manual invoicing
- [ ] Supabase or Postgres as the system of record — Formspree is a notification
      service, not a database
- [ ] Sentry for errors, uptime monitoring on every client webhook
- [ ] Standardise onboarding so client #5 takes a day, not a week
- [ ] Target: **₹1,00,000 MRR**

### Phase 3 — widen the offer (months 6–12)

- [ ] Second workflow sold into existing clients — the cheapest revenue you will find
- [ ] **Inbound voice**, and only inbound. See the stack note below.
- [ ] Client dashboard, if and only if clients ask for it
- [ ] First hire, or stop taking clients

### Phase 4 — only if the numbers demand it

Multi-tenancy, self-serve onboarding, usage billing. **Do not start this before 30
paying clients.** It is a different company.

---

## 5. The stack

### Running now

| Tool | For | Cost |
|---|---|---|
| Vercel | Site + serverless functions | Free (Hobby) |
| Anthropic API | Scoring, drafting, audits | ~₹3–5 per run |
| Resend | Transactional email | Free to 3,000/mo |
| Formspree | Form capture | Free tier |
| Cal.com | Booking | Free |
| Vercel Web Analytics | Traffic + events | Free |
| GitHub | Version control | Free |

### Add in phase 0–1

| Tool | For | Cost | Notes |
|---|---|---|---|
| **Razorpay** | Payments | 2% + GST | UPI matters enormously in India. Payment Links need no code. |
| **n8n** (self-hosted) | Client workflows | ~₹500–800/mo | Railway or Render. Do not use n8n Cloud at this scale. |
| **Bitwarden / 1Password** | Client credentials | ~₹250/mo | Non-negotiable. Never take credentials over WhatsApp. |
| **WhatsApp BSP** | WhatsApp Agent | varies | Gupshup, AiSensy or Interakt. Weeks of approval — start early. |
| Google Sheets / Airtable | Per-client logs | Free | Fine until phase 2. |

### Add in phase 2

| Tool | For | Cost |
|---|---|---|
| **Supabase** | Leads, conversations, usage | Free tier generous |
| **Sentry** | Error tracking | Free tier |
| **BetterStack / UptimeRobot** | Uptime on client webhooks | Free tier |
| **Zoho Books or Refrens** | GST invoicing | ~₹500–1,000/mo |
| Notion | Your own pipeline and SOPs | Free |

### Phase 3 — voice

Only when a client's specific problem is missed calls.

| Tool | For |
|---|---|
| **Exotel / Knowlarity / Ozonetel** | Indian telephony and numbers |
| **Vapi or Retell** | Realtime voice orchestration, if buying speed |
| Deepgram / ElevenLabs | STT and TTS, if assembling it yourself |

Two rules for voice:

1. **Inbound only.** Outbound AI calling in India runs into TRAI and DLT rules and is
   a fast way to get a number blacklisted. It also belongs in the refusals list next
   to cold outbound.
2. **Budget for latency.** Above roughly 800ms round trip it feels broken. Voice fails
   loudly and in front of a customer, which is why it is a phase 3 problem and not a
   phase 1 one.

### Deliberately not using

- **A CRM**, until there are enough clients to need one. Notion is fine.
- **n8n Cloud** — self-hosting is cheaper and you sell n8n, so run it.
- **Paid ads** — you do not yet know your conversion rate, CAC or ideal customer.
- **A custom platform** — everything above is rented until the revenue justifies owning it.

---

## 6. The one number that matters

Everything in phase 0 takes about a day. Everything in phase 2 onward is blocked on
phase 1, and phase 1 is blocked on a conversation with one business owner.

**83 commits, 0 clients.** The build is not the constraint and has not been for some
time. The next real signal comes from a person, not from this repository.
