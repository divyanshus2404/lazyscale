# What can actually be automated

A recognition list for sales calls, not a build backlog. When a prospect describes
their week, you should be able to place what they said, know roughly what it takes,
and know whether it is worth quoting.

**Legend**

- 🟢 **Sell it.** Recurring pain, countable saving, stable APIs, human can approve.
- 🟡 **Take it as a second project.** Real value, longer build or fiddlier integration.
- 🔴 **Careful.** Sells easily, disappoints often. Quote high or decline.
- ⛔ **Refuse.** Listed so you recognise it before agreeing to it on a call.

---

## Sales and revenue

| | Automation | Notes |
|---|---|---|
| 🟢 | **Lead capture across channels** | Web form, WhatsApp, Instagram, IndiaMART, sales@ into one pipeline. Almost always the first build. |
| 🟢 | **Instant first response** | The flagship. Under 60 seconds, personalised, references what they asked. |
| 🟢 | **Qualification and scoring** | Against criteria you extract on the kickoff call. This is where the value is, and the work. |
| 🟢 | **Routing and assignment** | Right rep, right territory, right product line. Trivial to build, disproportionately appreciated. |
| 🟢 | **Meeting booking** | Reply contains a booking link, or the AI proposes slots directly. |
| 🟢 | **Inbound follow-up sequences** | They enquired and went quiet. Two or three nudges, then stop. Not cold outbound. |
| 🟢 | **Quote and proposal drafting** | From a rate card and past jobs. Human approves before it sends. |
| 🟢 | **Proposal chasing** | Quote sent, silence. Polite escalating follow-up tied to days elapsed. |
| 🟡 | **CRM hygiene** | Dedupe, enrich, fill missing fields, fix stage drift. Dull, valuable, needs good API access. |
| 🟡 | **Deal updates from email threads** | Reads the thread, updates the stage and next step. Needs human confirmation early on. |
| 🟡 | **Renewal and expiry reminders** | Easy when the dates live somewhere queryable. |
| 🟡 | **Churn-risk flagging** | Usage or engagement drops, someone gets told. Needs real data to be worth anything. |

## Customer support

| | Automation | Notes |
|---|---|---|
| 🟢 | **Ticket and inbox triage** | Classify, tag, prioritise, route. Safe because nothing sends. |
| 🟢 | **FAQ deflection** | The same fifteen questions, answered instantly from a knowledge base you build with them. |
| 🟢 | **Draft replies for routine tickets** | Agent reviews and sends. Cuts handling time without risking the relationship. |
| 🟢 | **Escalation routing** | Anger, cancellation intent, legal words, VIP accounts — straight to a human. |
| 🟢 | **Out-of-hours acknowledgement** | Honest holding reply with a real timeframe. Cheap, and it stops the second angry message. |
| 🟡 | **SLA breach alerts** | Needs their ticket system to expose timestamps properly. |
| 🟡 | **Knowledge-base gap detection** | Escalation reasons clustered monthly. Feeds the next tranche of deflection. |
| 🟡 | **Post-resolution follow-up and review requests** | Timing matters more than wording. |

## Operations

| | Automation | Notes |
|---|---|---|
| 🟢 | **Client onboarding** | Deal won, and the workspace, docs, kickoff and welcome all happen. |
| 🟢 | **Document collection and chasing** | Missing KYC, missing brief, missing assets. Nobody enjoys this and everybody needs it. |
| 🟢 | **Appointment reminders** | Direct, measurable no-show reduction. Easiest ROI conversation you will have. |
| 🟢 | **Order and delivery updates** | Status changes pushed to the customer before they ask. |
| 🟡 | **Meeting notes to tasks** | Transcript in, tasks out, assigned in Linear or Asana. Good demo, needs a transcription source. |
| 🟡 | **Approval routing** | Discounts, refunds, purchase orders. Value depends on how painful their current chain is. |
| 🟡 | **Vendor and supplier chasing** | Same shape as payment chasing, pointed outward. |
| 🟡 | **Inventory and threshold alerts** | Only if the stock data is trustworthy. It often is not. |

## Finance and admin

| | Automation | Notes |
|---|---|---|
| 🟢 | **Payment reminders by invoice age** | Money-adjacent, so the ROI conversation is over before it starts. |
| 🟢 | **Invoice generation and dispatch** | From an approved trigger. Generating is fine; taking payment is not. |
| 🟡 | **Receipt and expense capture** | Photo or email in, categorised row out. Popular, moderately fiddly. |
| 🟡 | **Reconciliation flagging** | Surface mismatches for a human. Never auto-resolve them. |
| 🟡 | **GST return data preparation** | Prepare and present. A person files it. Verify the Tally or Zoho API on their plan before quoting. |
| 🔴 | **Anything that moves money** | See refusals. |

## Marketing

| | Automation | Notes |
|---|---|---|
| 🟢 | **Ad lead forms into the pipeline** | Meta and Google lead forms into scoring and instant reply. Short build, obvious value. |
| 🟢 | **Review requests and monitoring** | Ask at the right moment, alert on anything under three stars. |
| 🟡 | **Content repurposing** | One long piece into posts, newsletter, clips. Works, but see the caution below. |
| 🟡 | **Competitor and mention monitoring** | Cheap to build, easy to demo, modest real value. |
| 🔴 | **Social content generation at volume** | Crowded, commoditised, constant quality complaints, high churn. Attracts price shoppers. |
| ⛔ | **Cold outbound at scale** | See refusals. |

## Hiring

| | Automation | Notes |
|---|---|---|
| 🟢 | **Application screening** | Against real criteria. High applicant volumes in India make this genuinely valuable. |
| 🟢 | **Interview scheduling and reminders** | Calendar tetris nobody wants to play. |
| 🟢 | **Candidate communication** | Acknowledgements, status updates, kind rejections. The rejections matter more than people think. |
| 🟡 | **Offer and document generation** | Templated, human-approved. |
| 🟡 | **Employee FAQ** | Leave policy, reimbursements, IT requests. Internal-facing, so mistakes are cheap. |

## Reporting and internal

| | Automation | Notes |
|---|---|---|
| 🟢 | **Weekly MIS** | Numbers pulled, summary written, outliers flagged, posted Monday. Indian founders ask for this by name. |
| 🟢 | **Anomaly alerts** | Revenue drop, spike in tickets, conversion fall. Value is in the threshold, not the plumbing. |
| 🟡 | **Cross-tool sync** | Sheets to CRM to Notion. Boring, brittle, sometimes exactly what they need. |
| 🟡 | **Standup and status summaries** | For engineering teams. Easy sale into a technical buyer, small ticket. |
| 🟡 | **Incident alert routing** | Group, deduplicate, summarise, page the right person. |

---

## The four-question filter

Before quoting anything above:

1. Does the pain recur **weekly or more**?
2. Is the saving **countable** in hours or rupees?
3. Can a **human approve** before anything irreversible?
4. Do they **already own the tools**?

**Two failures means walk away or rescope.** And check the API exists *on their plan*
— "it has an API" and "we can use it" are different sentences.

## ⛔ Refuse these

- **Fully autonomous cold outbound.** Deliverability damage, legal exposure, and it makes you the spam vendor.
- **WhatsApp broadcast to scraped or bought lists.** Gets their number banned.
- **Executing payments, transfers or trades.** One bug ends the business.
- **Anything irreversible with no human approval**, unless explicitly agreed in writing.
- **Scraping behind a login**, or anything needing a CAPTCHA solved.
- **Medical, legal or financial advice** generated by a model and sent to end users.
- **Replacing a named person's judgement** where being wrong is expensive and nobody checks.

## What to say when it should not be automated

Some of the best calls end with you talking someone out of a project:

- **It happens rarely.** Automating a monthly 20-minute task saves four hours a year.
- **The process is still changing.** You will rebuild it monthly. Wait until it settles.
- **The real problem is upstream.** Bad lead quality is an ad targeting problem; automating follow-up just processes junk faster.
- **One person does it and likes it.** Automation that removes the interesting part of a job gets quietly sabotaged.

Saying this costs one project and earns the next three.
