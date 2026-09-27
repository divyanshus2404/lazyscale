#!/usr/bin/env python3
"""Builds index.html, pricing.html and about.html from one design system.

Run after editing _sys.css, _head.py or this file:

    python3 _build.py

Everything factual here comes from what the business already publishes: the
four job descriptions in services/ai-employees/, the pricing that was on the
old page, and the integrations the old page already listed. Nothing is
invented — in particular there are no customers, no testimonials and no
metrics, because there are none to report.
"""
import io
from _head import head, nav, FOOTER, GET_STARTED

TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>'

# ── 4 AI employees: one card per job description that actually exists ───────
EMPLOYEES = [
    dict(name="Lead Responder", job="Captures, qualifies and follows up with every inbound lead.",
         status="Active", ui=[("New lead", "Rahul — WhatsApp"), ("Budget", "₹1.2 Cr"), ("Location", "Whitefield")],
         score="9 / 10", done=["Reply sent", "Recorded", "Sales notified"]),
    dict(name="WhatsApp Agent", job="Answers repetitive questions on the channel your customers actually use.",
         status="Active", ui=[("Asked", "“Open on Sunday?”"), ("Channel", "WhatsApp"), ("Time", "11:41 pm")],
         score="Routine", done=["Answered in 40s", "Thread logged"]),
    dict(name="Collections Clerk", job="Follows up on overdue invoices, politely and on schedule.",
         status="Active", ui=[("Invoice", "#2291 — ₹48,000"), ("Overdue", "12 days"), ("Attempt", "2 of 3")],
         score="Due today", done=["Reminder sent", "Owner copied"]),
    dict(name="Onboarding Coordinator", job="Keeps a new customer moving through the steps after they sign.",
         status="Active", ui=[("Customer", "Meera Interiors"), ("Step", "3 of 5 — documents"), ("Waiting on", "Customer")],
         score="On track", done=["Nudge sent", "Checklist updated"]),
]

CHORES = ["Qualifying leads", "Answering the same question again",
          "Updating the CRM", "Sending follow-ups",
          "Chasing overdue payments", "Putting the weekly report together"]

# Order matters and is not cosmetic: the enquiry is recorded BEFORE the model is
# called, so a failure further down never costs the lead. Showing "Record" last
# would contradict both the product and the sentence above it.
STEPS = [("Lead", "A message arrives on any channel"),
         ("Record", "Written down before anything else is tried"),
         ("AI", "Reads what was actually asked"),
         ("Decision", "Scores it against your criteria"),
         ("Action", "Replies, or hands it to a person")]

HOW = [("01", "Connect", "Point an existing form, inbox or WhatsApp number at us. No migration, and no passwords change hands."),
       ("02", "Choose", "Pick the AI employee for the job. Each one arrives with a written job description and a probation period."),
       ("03", "Run", "It works the queue. You get the ones worth your time, and a monthly review of what it actually did.")]

TOOLS = ["WhatsApp", "Instagram", "Gmail", "Slack", "Google Sheets", "HubSpot",
         "Airtable", "Notion", "Shopify", "Stripe", "Razorpay", "Calendly"]

TIERS = [
    dict(name="Starter", price="₹9,999", note="One workflow, fully managed",
         feats=["1 AI employee", "1,000 AI actions / month", "Email support", "Monthly performance review"]),
    dict(name="Growth", price="₹19,999", note="For teams ready to add more", best=True,
         feats=["3 AI employees", "10,000 AI actions / month", "Priority Slack support", "Monthly optimisation call", "Custom branding"]),
    dict(name="Scale", price="₹39,999", note="Full autopilot operations",
         feats=["Unlimited AI employees", "50,000 AI actions / month", "Custom integrations", "Dedicated Slack channel", "Priority SLA"]),
]


def employee_card(e):
    rows = "".join(f'<div class="row"><span class="k">{k}</span><span class="v">{v}</span></div>' for k, v in e["ui"])
    done = "".join(f'<div class="done">{TICK}{d}</div>' for d in e["done"])
    return f"""<div class="emp reveal">
      <div class="ui">
        <div class="ui-bar"><span class="pip"></span>{e['name']}<span class="st">{e['status']}</span></div>
        <div class="ui-body">
          {rows}
          <div><span class="score">{e['score']}</span></div>
          <div class="hr"></div>
          {done}
        </div>
      </div>
      <h3>{e['name']}</h3>
      <p class="emp-job">{e['job']}</p>
    </div>"""


def build_index():
    cards = "\n".join(employee_card(e) for e in EMPLOYEES)
    chores = "".join(f'<li>{c}</li>' for c in CHORES)
    steps = "".join(
        f'<div class="step reveal"><span class="step-n">{i+1:02d}</span><b>{n}</b><span>{d}</span></div>'
        + ('<div class="step-arrow" aria-hidden="true">→</div>' if i < len(STEPS) - 1 else '')
        for i, (n, d) in enumerate(STEPS))
    how = "".join(
        f'<div class="reveal"><div class="how-n">{n}</div><h3>{t}</h3><p class="lede" style="font-size:15.5px;margin-top:8px">{d}</p></div>'
        for n, t, d in HOW)
    tools = "".join(f'<div class="tool">{t}</div>' for t in TOOLS)
    tiers = "".join(
        f'''<a class="tier{' tier-best' if t.get('best') else ''} reveal" href="/pricing.html">
          <b>{t['name']}</b><span class="tier-note">{t['note']}</span>
          <span class="tier-price">{t['price']}<small>/month</small></span>
        </a>''' for t in TIERS)

    return head("LazyScale — AI employees for repetitive work",
                "LazyScale gives your team AI employees that handle repetitive sales, support and operations work automatically.",
                "https://lazyscale.vercel.app/") + nav("product") + f"""
<main>

  <!-- 1. Hero -->
  <section class="sec hero">
    <div class="wrap">
      <h1>AI employees for<br>repetitive work.</h1>
      <p class="lede" style="font-size:19px;max-width:32em">LazyScale gives your team AI employees that handle repetitive sales, support and operations work automatically.</p>
      <div class="hero-ctas">
        <a class="btn btn-lg" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a>
        <a class="link" href="#demo">See how it works <span>→</span></a>
      </div>

      <div class="hero-ui">
        <div class="ui">
          <div class="ui-bar"><span class="pip"></span>Lead Responder<span class="st">Active</span></div>
          <div class="ui-body">
            <div class="row"><span class="k">New lead</span><span class="v">Rahul — WhatsApp · 11:41 pm</span></div>
            <div class="row"><span class="k">Asked</span><span class="v">“Looking for a 3BHK in Whitefield, need to move in 2 months.”</span></div>
            <div class="row"><span class="k">Budget</span><span class="v">₹1.2 Cr</span></div>
            <div class="row"><span class="k">Qualified</span><span class="v"><span class="score">9 / 10</span></span></div>
            <div class="hr"></div>
            <div class="done">{TICK}Reply sent — 41 seconds after it arrived</div>
            <div class="done">{TICK}Recorded before the model was called</div>
            <div class="done">{TICK}Flagged for a human callback</div>
          </div>
          <div class="ui-foot">An example of the Lead Responder's output. Anything it should not answer goes to a person instead.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 2. Problem -->
  <section class="sec">
    <div class="wrap grid-2 problem">
      <div class="reveal">
        <div class="eyebrow">The problem</div>
        <h2>Your team is busy.<br>Your AI employees aren't.</h2>
      </div>
      <div class="reveal">
        <p class="lede" style="margin-top:0">Nobody was hired to do these. They are the work that fills a day and leaves nothing behind.</p>
        <ul class="chores">{chores}</ul>
      </div>
    </div>
  </section>

  <!-- 3. AI employees -->
  <section class="sec" id="employees">
    <div class="wrap">
      <div class="eyebrow">AI employees</div>
      <h2>One AI employee. One job.<br>Zero busywork.</h2>
      <p class="lede">Each one arrives with a written job description, a probation period and a monthly performance review — so you can tell whether it is earning its keep.</p>
      <div class="emp-grid">{cards}</div>
      <a class="link" href="/automations.html" style="margin-top:var(--s6)">Explore all AI employees <span>→</span></a>
    </div>
  </section>

  <!-- 4. Product demonstration -->
  <section class="sec" id="demo">
    <div class="wrap">
      <div class="eyebrow">How the work moves</div>
      <h2>See it work.</h2>
      <p class="lede">One enquiry, from arrival to answer. The highlighted step is the one that matters: everything after it can fail and the enquiry is still yours.</p>
      <div class="steps">{steps}</div>
    </div>
  </section>

  <!-- 5. How it works -->
  <section class="sec">
    <div class="wrap">
      <div class="eyebrow">Getting started</div>
      <h2>Three steps, and none of them are a migration.</h2>
      <div class="grid-3 how">{how}</div>
    </div>
  </section>

  <!-- 6. Integrations -->
  <section class="sec">
    <div class="wrap">
      <div class="eyebrow">Integrations</div>
      <h2>Keep the tools you already use.</h2>
      <p class="lede">We work around your stack rather than asking you to move to ours.</p>
      <div class="tools">{tools}</div>
    </div>
  </section>

  <!-- 7. What we publish — no testimonials, because there are none -->
  <section class="sec">
    <div class="wrap">
      <div class="eyebrow">What we publish</div>
      <h2>No case studies yet.<br>Here is what you can check instead.</h2>
      <div class="grid-3 proof">
        <a class="card proof-cell reveal" href="/automations.html"><span class="n">55</span><b>things we automate</b><p>Listed in full, with what each one is actually worth.</p></a>
        <a class="card proof-cell reveal" href="/automations.html"><span class="n">7</span><b>things we refuse to build</b><p>Nothing that moves money. Nothing that pretends to be a person.</p></a>
        <a class="card proof-cell reveal" href="https://github.com/divyanshus2404/lazyscale" target="_blank" rel="noopener"><span class="n">↗</span><b>The source, in public</b><p>The endpoints that do the work, and the tests that keep them honest.</p></a>
      </div>
    </div>
  </section>

  <!-- 8. Pricing preview -->
  <section class="sec">
    <div class="wrap">
      <div class="eyebrow">Pricing</div>
      <h2>Pay for what you automate.</h2>
      <p class="lede">No long contracts, cancel any time. Start with one AI employee and add more when the first one has proved itself.</p>
      <div class="grid-3 tiers">{tiers}</div>
      <a class="link" href="/pricing.html" style="margin-top:var(--s6)">View full pricing <span>→</span></a>
    </div>
  </section>

  <!-- 9. Founder -->
  <section class="sec">
    <div class="wrap founder">
      <div class="reveal">
        <div class="eyebrow">Who builds it</div>
        <h2 style="font-size:clamp(24px,2.6vw,32px)">Built by Divyanshu Singh</h2>
        <p class="lede">“I'm building LazyScale to give small teams the leverage of a much larger operations team.”</p>
        <p style="margin-top:var(--s5)"><a class="link" href="/about.html">More about why <span>→</span></a></p>
      </div>
    </div>
  </section>

  <!-- 10. Final CTA -->
  <section class="sec cta">
    <div class="wrap">
      <h2>Stop doing work a machine can do.</h2>
      <p class="lede" style="margin-left:auto;margin-right:auto;text-align:center">Deploy your first AI employee today.</p>
      <div style="margin-top:var(--s6)"><a class="btn btn-lg" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a></div>
    </div>
  </section>

</main>
""" + FOOTER


def build_pricing():
    def tier(t):
        feats = "".join(f'<li>{TICK}{f}</li>' for f in t["feats"])
        return f"""<div class="card ptier{' ptier-best' if t.get('best') else ''} reveal">
          {'<span class="badge">Most chosen</span>' if t.get('best') else ''}
          <b class="ptier-name">{t['name']}</b>
          <p class="ptier-note">{t['note']}</p>
          <div class="ptier-price">{t['price']}<small>/month</small></div>
          <p class="ptier-setup">One-time setup from ₹15,000</p>
          <ul class="feats">{feats}</ul>
          <a class="btn{'' if t.get('best') else ' btn-ghost'}" href="{GET_STARTED}" target="_blank" rel="noopener" style="width:100%">Get Started</a>
        </div>"""
    tiers = "".join(tier(t) for t in TIERS)
    return head("Pricing — LazyScale",
                "Pay for what you automate. Starter, Growth and Scale — no long contracts, cancel any time.",
                "https://lazyscale.vercel.app/pricing.html") + nav("pricing") + f"""
<main>
  <section class="sec">
    <div class="wrap">
      <div class="eyebrow">Pricing</div>
      <h1 style="font-size:clamp(34px,4.4vw,52px)">Pay for what you automate.</h1>
      <p class="lede">No long contracts. Cancel any time. Start with one AI employee and add more when the first has proved itself.</p>
      <div class="grid-3 ptiers">{tiers}</div>
      <div class="card notes">
        <h3>What "AI actions" means</h3>
        <p>One action is one thing an AI employee does on your behalf — reading an enquiry, drafting a reply, scoring a lead, sending a reminder. A busy month for a small business is usually a few hundred.</p>
        <h3 style="margin-top:var(--s5)">What the setup fee covers</h3>
        <p>Connecting your channels, writing the qualification criteria with you, and running the first week alongside you before anything answers on its own.</p>
        <h3 style="margin-top:var(--s5)">What happens if it doesn't work</h3>
        <p>Every AI employee has a probation period. If it hasn't earned its keep by the first monthly review, stop it — there is no contract to exit.</p>
      </div>
    </div>
  </section>
</main>
""" + FOOTER


def build_about():
    return head("About — LazyScale",
                "One person, building enquiry response for small businesses in India. What LazyScale is, and what it refuses to build.",
                "https://lazyscale.vercel.app/about.html") + nav("about") + f"""
<main>
  <section class="sec">
    <div class="wrap" style="max-width:760px">
      <div class="eyebrow">About</div>
      <h1 style="font-size:clamp(32px,4vw,48px)">There is one person behind this.</h1>
      <div class="prose">
        <p>My name is Divyanshu Singh. I build the automations, I connect them to your tools, and when one breaks at 2am it is my phone that goes off. There is no team behind me and no support queue in front of me — the person you talk to is the person doing the work.</p>
        <p>LazyScale exists because most businesses here don't lose customers on price. They lose them because someone was asleep, or on a call, or the message landed on WhatsApp while everyone was watching email. The enquiry was fine. The timing wasn't.</p>
        <p>So this isn't “AI for your business”. It is <strong>response time</strong>, and everything I build points at that one number.</p>

        <h2>Sold as employees, not software</h2>
        <p>Each AI employee arrives with a written job description, a probation period and a monthly performance review. That sounds like a gimmick until you have been sold software that does forty things and none of them well. A job description says what a thing will do and — more usefully — what it won't.</p>

        <h2>What I won't build</h2>
        <p>Seven things, published in full next to the fifty-five I will. Nothing that moves money on its own. Nothing that pretends to be a person. No cold outbound at scale, and no scraping behind a login. The list is on the <a href="/automations.html">catalogue page</a>, with the reason under each one.</p>

        <h2>What I can't claim yet</h2>
        <p>No case studies, no testimonials and no customer count — because there are none. When there are, they will appear with real numbers attached. Until then the page that was built to publish response times sits empty rather than filled with something plausible.</p>
        <p>The whole thing is <a href="https://github.com/divyanshus2404/lazyscale" target="_blank" rel="noopener">public on GitHub</a>, including the endpoints that do the work and the tests that keep them honest.</p>
      </div>
      <div style="margin-top:var(--s7);display:flex;gap:var(--s4);flex-wrap:wrap">
        <a class="btn" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a>
        <a class="btn btn-ghost" href="mailto:divyanshus2404@gmail.com">Email me</a>
      </div>
    </div>
  </section>
</main>
""" + FOOTER


if __name__ == "__main__":
    for name, fn in (("index.html", build_index), ("pricing.html", build_pricing), ("about.html", build_about)):
        html = fn()
        io.open(name, "w", encoding="utf-8").write(html)
        print(f"wrote {name} ({len(html):,} bytes)")
