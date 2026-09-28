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
         status="Active", ui=[("New lead", "Rahul, on WhatsApp"), ("Budget", "₹1.2 Cr"), ("Location", "Whitefield")],
         score="9 / 10", done=["Reply sent", "Recorded", "Sales notified"]),
    dict(name="WhatsApp Agent", job="Answers repetitive questions on the channel your customers actually use.",
         status="Active", ui=[("Asked", "“Open on Sunday?”"), ("Channel", "WhatsApp"), ("Time", "11:41 pm")],
         score="Routine", done=["Answered in 40s", "Thread logged"]),
    dict(name="Collections Clerk", job="Follows up on overdue invoices, politely and on schedule.",
         status="Active", ui=[("Invoice", "#2291, ₹48,000"), ("Overdue", "12 days"), ("Attempt", "2 of 3")],
         score="Due today", done=["Reminder sent", "Owner copied"]),
    dict(name="Onboarding Coordinator", job="Keeps a new customer moving through the steps after they sign.",
         status="Active", ui=[("Customer", "Meera Interiors"), ("Step", "3 of 5, documents"), ("Waiting on", "Customer")],
         score="On track", done=["Nudge sent", "Checklist updated"]),
]


HOW = [("01", "Connect", "Point an existing form, inbox or WhatsApp number at us. No migration, and no passwords change hands."),
       ("02", "Choose", "Pick the AI employee for the job. Each one arrives with a written job description and a probation period."),
       ("03", "Run", "It works the queue. You get the ones worth your time, and a monthly review of what it actually did.")]

# ── FAQ ────────────────────────────────────────────────────────────────────
# Carried over from the old page, with four answers corrected. The old versions
# are listed against each one, because two of them were not true.
FAQ = [
 ("What tools do you connect to?",
  "Slack, Gmail, Notion, Airtable, HubSpot, Calendly, Stripe, Shopify, WhatsApp, Instagram and Google Sheets. If your enquiries arrive somewhere else, forwarding one kind of email is usually enough to get started."),

 # Was: "Most workflows go live in 48 hours." Nothing has ever been delivered to
 # a client, so there is no delivery time to promise.
 ("How long does setup take?",
  "The drop-in is quick. Your existing form posts to us, every enquiry gets captured, and you get alerted. A full build takes longer, because the qualification criteria have to be written around how your business actually works. Either way you will see it running on your own enquiries before it answers anyone."),

 ("What if I want to cancel?",
  "Stop whenever you like. No contract, no exit fee, and nothing to migrate back out of, because nothing moved in the first place. Ask and we delete what we hold."),

 ("Do I need to be technical?",
  "No. You describe what should happen in plain language, and the connecting, building and maintaining is the job you are paying for."),

 ("Will it make mistakes?",
  "Yes, sometimes. So it is built to fail in the cheap direction. Anything it should not answer goes to a person instead, and nothing irreversible happens without someone approving it. Complaints, price negotiations and questions about existing orders are escalated by default."),

 # Was: "Most startups on Growth never hit the cap." There are no customers, so
 # there is no distribution to describe.
 ("What counts as an AI action?",
  "One action is one thing an AI employee does on your behalf: reading an enquiry, drafting a reply, scoring a lead, sending a reminder. A busy month for a small business usually runs to a few hundred."),

 ("Can I change plans later?",
  "Up or down, any time, effective from your next billing cycle. No penalty either way."),

 # Was: "We never store your customer data... We use encrypted connections and
 # follow SOC 2 practices." Both false. Every enquiry is recorded — name, email,
 # phone and message — because that is how the monthly review is produced and
 # how a failure downstream never costs you the lead. SOC 2 is an audit nobody
 # here has been through.
 ("What happens to my customers' data?",
  "We do store it, and it is worth being exact about that. Every enquiry is recorded before anything else is attempted: name, email, phone and message. That is what stops a failure further down the line from losing you the lead, and it is what the monthly review is built from. It lives in a Supabase database only the server can reach, and one tenant's records are never readable by another. We have not been through a SOC 2 audit, so we do not claim one. Ask for your data and we hand it over or delete it."),
]


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
    how = "".join(
        f'<div class="reveal"><div class="how-n">{n}</div><h3>{t}</h3><p class="how-p">{d}</p></div>'
        for n, t, d in HOW)
    tools = "".join(f'<span>{t}</span>' for t in TOOLS)
    tiers = "".join(
        f'''<a class="tier{' tier-best' if t.get('best') else ''} reveal" href="/pricing.html">
          <b>{t['name']}</b><span class="tier-note">{t['note']}</span>
          <span class="tier-price">{t['price']}<small>/month</small></span>
        </a>''' for t in TIERS)

    return head("AI employees for repetitive work · LazyScale",
                "LazyScale gives your team AI employees that handle repetitive sales, support and operations work automatically.",
                "https://lazyscale.vercel.app/") + nav("product") + f"""
<main id="main">

  <!-- 1. Hero. Centred, and the product sits directly under the headline:
       the interactive demo is the hero visual, not a picture of one.
       It runs entirely in the browser (see /demo.js), so it costs nothing. -->
  <section class="sec hero hero-c">
    <div class="wrap">
      <a class="pill" href="#demo"><span class="dot"></span>Early access · Lead Responder is live</a>
      <h1>AI employees for<br>repetitive work.</h1>
      <p class="lede">LazyScale gives your team AI employees that handle repetitive sales, support and operations work automatically.</p>
      <div class="hero-ctas">
        <a class="btn btn-lg" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a>
        <a class="btn btn-lg btn-ghost" href="#demo">Try the demo</a>
      </div>
      <p class="hero-meta">No migration · no new software to learn · no passwords change hands</p>

      <div class="demo card" id="lazyscale-demo">
        <span class="demo-anchor" id="demo"></span>
        <div class="demo-top">
          <span class="lab">Try it · paste a customer enquiry</span>
          <span class="demo-note">Runs in your browser. Nothing is sent.</span>
        </div>
        <div id="demo-input"></div>
        <div id="demo-progress"></div>
        <div id="demo-result"></div>
      </div>
      <noscript><p class="demo-note">The demo needs JavaScript. Everything else on this page works without it.</p></noscript>

      <div class="works">
        <span class="lab">Works with the tools you already use</span>
        <div class="works-row">{tools}</div>
      </div>
    </div>
  </section>

  <!-- 2. AI employees -->
  <section class="sec" id="employees">
    <div class="wrap">
      <div class="sec-head">
        <div class="eyebrow">AI employees</div>
        <h2>One AI employee. One job.</h2>
        <p class="lede">Each one arrives with a written job description, a probation period and a monthly performance review, so you can tell whether it is earning its keep.</p>
      </div>
      <div class="emp-grid">{cards}</div>
      <div class="sec-more"><a class="link" href="/automations.html">Explore all AI employees <span>→</span></a></div>
    </div>
  </section>

  <!-- 3. Control. The line that makes the rest believable. -->
  <section class="sec sec-soft">
    <div class="wrap">
      <div class="sec-head">
        <div class="eyebrow">You stay in control</div>
        <h2>AI handles the repetitive work.<br>You handle the rest.</h2>
        <p class="lede">Every enquiry is written down first, then sorted into one of two lanes before anything is sent.</p>
      </div>
      <div class="hitl-lanes">
        <div class="hitl-lane reveal">
          <span class="lab">Safe to automate</span>
          <b>AI can handle</b>
          <ul><li>Simple enquiry</li><li>Availability question</li><li>Brochure or details request</li></ul>
        </div>
        <div class="hitl-lane hitl-human reveal">
          <span class="lab">Needs a human</span>
          <b>Owner reviews</b>
          <ul><li>Price negotiation</li><li>Complaint</li><li>Refund request</li><li>Existing order issue</li></ul>
        </div>
      </div>
    </div>
  </section>

  <!-- 4. How it works -->
  <section class="sec">
    <div class="wrap">
      <div class="sec-head">
        <div class="eyebrow">Getting started</div>
        <h2>Three steps, and none of them are a migration.</h2>
      </div>
      <div class="grid-3 how">{how}</div>
    </div>
  </section>

  <!-- 5. Pricing preview -->
  <section class="sec">
    <div class="wrap">
      <div class="sec-head">
        <div class="eyebrow">Pricing</div>
        <h2>Pay for what you automate.</h2>
        <p class="lede">No long contracts, cancel any time. Start with one AI employee and add more when the first one has proved itself.</p>
      </div>
      <div class="grid-3 tiers">{tiers}</div>
      <div class="sec-more"><a class="link" href="/pricing.html">View full pricing <span>→</span></a></div>
    </div>
  </section>

  <!-- 6. Founder. No testimonials, because there are none yet. -->
  <section class="sec">
    <div class="wrap founder">
      <div class="reveal">
        <div class="eyebrow">Who builds it</div>
        <h2 style="font-size:var(--t-h3)">Built by Divyanshu Singh</h2>
        <p class="lede">“I am building LazyScale so a business with four people can answer enquiries like a business with forty.”</p>
        <p class="founder-links"><a class="link" href="/about.html">More about why <span>→</span></a><a class="link" href="https://github.com/divyanshus2404/lazyscale" target="_blank" rel="noopener">The source is public <span>↗</span></a></p>
      </div>
    </div>
  </section>

  <!-- 7. Final CTA -->
  <section class="sec sec-soft cta">
    <div class="wrap">
      <h2>Stop doing work a machine can do.</h2>
      <p class="lede" style="margin-left:auto;margin-right:auto;text-align:center">Deploy your first AI employee today.</p>
      <div class="hero-ctas" style="justify-content:center"><a class="btn btn-lg" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a><a class="btn btn-lg btn-ghost" href="#demo">Try the demo</a></div>
    </div>
  </section>

</main>
<script src="/demo.js" defer></script>
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
    return head("Pricing · LazyScale",
                "Pay for what you automate. Starter, Growth and Scale, with no long contracts and no notice period.",
                "https://lazyscale.vercel.app/pricing.html") + nav("pricing") + f"""
<main id="main">
  <section class="sec">
    <div class="wrap">
      <div class="eyebrow">Pricing</div>
      <h1 style="font-size:var(--t-h1)">Pay for what you automate.</h1>
      <p class="lede">No long contracts. Cancel any time. Start with one AI employee and add more when the first has proved itself.</p>
      <div class="grid-3 ptiers">{tiers}</div>
      <div class="card notes">
        <h3>What "AI actions" means</h3>
        <p>One action is one thing an AI employee does on your behalf. Reading an enquiry, drafting a reply, scoring a lead, sending a reminder. A busy month for a small business is usually a few hundred.</p>
        <h3 style="margin-top:var(--s5)">What the setup fee covers</h3>
        <p>Connecting your channels, writing the qualification criteria with you, and running the first week alongside you before anything answers on its own.</p>
        <h3 style="margin-top:var(--s5)">What happens if it doesn't work</h3>
        <p>Every AI employee has a probation period. If it has not earned its keep by the first monthly review, stop it. There is no contract to exit.</p>
      </div>
    </div>
  </section>
</main>
""" + FOOTER


def build_about():
    return head("About · LazyScale",
                "One person, building enquiry response for small businesses in India. What LazyScale is, and what it refuses to build.",
                "https://lazyscale.vercel.app/about.html") + nav("about") + f"""
<main id="main">
  <section class="sec">
    <div class="wrap" style="max-width:760px">
      <div class="eyebrow">About</div>
      <h1 style="font-size:var(--t-h1)">There is one person behind this.</h1>
      <div class="prose">
        <p>My name is Divyanshu Singh. I build the automations, I connect them to your tools, and when one breaks at 2am it is my phone that goes off. There is no team behind me and no support queue in front of me. The person you talk to is the person doing the work.</p>
        <p>LazyScale exists because most businesses here don't lose customers on price. They lose them because someone was asleep, or on a call, or the message landed on WhatsApp while everyone was watching email. The enquiry was fine. The timing wasn't.</p>
        <p>What I am selling is <strong>response time</strong>. Everything I build points at that one number.</p>

        <h2>Sold as employees, not software</h2>
        <p>Each AI employee arrives with a written job description, a probation period and a monthly performance review. That sounds like a gimmick until you have been sold software that does forty things and none of them well. A job description says what a thing will do, and more usefully what it will not.</p>

        <h2>What I won't build</h2>
        <p>Seven things, published in full next to the fifty-five I will. Nothing that moves money on its own, nothing that pretends to be a person, no cold outbound at scale, no scraping behind a login. The list is on the <a href="/automations.html">catalogue page</a>, with the reason under each one.</p>

        <h2>What I can't claim yet</h2>
        <p>No case studies, no testimonials and no customer count, because there are none. When there are, they will appear with real numbers attached. Until then the page built to publish response times sits empty rather than filled with something plausible.</p>
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


def build_faq():
    items = "".join(
        f'''<details class="qa reveal"><summary><span>{q}</span><i aria-hidden="true">+</i></summary><p>{a}</p></details>'''
        for q, a in FAQ)
    return head("Questions · LazyScale",
                "What LazyScale connects to, how long setup takes, what happens to your customers' data, and what it will not do.",
                "https://lazyscale.vercel.app/faq.html") + nav("") + f"""
<main id="main">
  <section class="sec">
    <div class="wrap" style="max-width:780px">
      <div class="eyebrow">Questions</div>
      <h1 style="font-size:var(--t-h1)">The ones people actually ask.</h1>
      <p class="lede">If yours is not here, email it and the answer will end up on this page.</p>
      <div class="qas">{items}</div>
      <div style="margin-top:var(--s7);display:flex;gap:var(--s4);flex-wrap:wrap">
        <a class="btn" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a>
        <a class="btn btn-ghost" href="mailto:divyanshus2404@gmail.com">Ask something else</a>
      </div>
    </div>
  </section>
</main>
""" + FOOTER


def build_404():
    return head("Not found · LazyScale", "That page does not exist.",
                "https://lazyscale.vercel.app/404.html") + nav("") + """
<main id="main">
  <section class="sec" style="text-align:center">
    <div class="wrap" style="max-width:520px">
      <div class="eyebrow">404</div>
      <h1 style="font-size:var(--t-h1)">That page isn't here.</h1>
      <p class="lede" style="margin-left:auto;margin-right:auto">It may have moved while the site was being rebuilt. The useful ones are below.</p>
      <div style="margin-top:var(--s6);display:flex;gap:var(--s3);justify-content:center;flex-wrap:wrap">
        <a class="btn" href="/">Home</a>
        <a class="btn btn-ghost" href="/automations.html">What we automate</a>
        <a class="btn btn-ghost" href="/pricing.html">Pricing</a>
      </div>
    </div>
  </section>
</main>
""" + FOOTER


# ── Solutions: the catalogue, on the design system ─────────────────────────
TIER_LABEL = {
    "yes":     ("We build this", "Recurring, countable, and a person can approve anything that matters."),
    "later":   ("Worth it later", "Real value, but a longer build. Better once the first one is running."),
    "careful": ("We will push back", "Sells easily and disappoints often. We will probably talk you out of it."),
    "no":      ("We refuse", "Not negotiable, at any price."),
}
TIER_ORDER = ["yes", "later", "careful", "no"]


def build_automations():
    import json
    data = json.load(io.open("data/automations.json", encoding="utf-8"))
    items, cats = data["items"], data["categories"]

    chips = "".join(
        f'<button class="chip{" chip-on" if c == "All" else ""}" type="button" data-cat="{c}">{c}</button>'
        for c in ["All"] + cats)

    rows = []
    for tier in TIER_ORDER:
        group = [i for i in items if i["tier"] == tier]
        if not group:
            continue
        label, note = TIER_LABEL[tier]
        rows.append(
            f'''<div class="tier-head" data-tier="{tier}">
                 <h2>{label}</h2><p class="lede">{note}</p>
               </div>''')
        rows.append('<div class="cat-list">')
        for i in group:
            rows.append(
                f'''<div class="cat-row" data-cat="{i["category"]}" data-tier="{tier}">
                     <span class="cat-tag">{i["category"]}</span>
                     <div><b>{i["title"]}</b><p>{i["body"]}</p></div>
                   </div>''')
        rows.append('</div>')

    return head("What we automate · LazyScale",
                "Fifty-five things we automate for small businesses in India, and the seven we refuse to build.",
                "https://lazyscale.vercel.app/automations.html") + nav("solutions") + f"""
<main id="main">
  <section class="sec">
    <div class="wrap">
      <div class="eyebrow">Solutions</div>
      <h1>What we automate,<br>and what we refuse.</h1>
      <p class="lede">Most agencies will tell you everything is automatable. Here is the honest version: {len(items)} things we build, in the order we would build them, and the seven we will not build at any price.</p>

      <div class="chips" role="group" aria-label="Filter by area">{chips}</div>
      <p class="count" id="count" aria-live="polite"></p>

      <div id="list">{"".join(rows)}</div>

      <div class="card notes" style="margin-top:var(--s8)">
        <h3>How we decide</h3>
        <p>Four questions, and two failures means we tell you it is not worth building: does it happen weekly or more, can you name what it costs you, can someone approve it before anything irreversible happens, and do you already own the tools?</p>
      </div>

      <div style="margin-top:var(--s7);display:flex;gap:var(--s4);flex-wrap:wrap">
        <a class="btn" href="{GET_STARTED}" target="_blank" rel="noopener">Get Started</a>
        <a class="btn btn-ghost" href="/pricing.html">See pricing</a>
      </div>
    </div>
  </section>
</main>

<script>
(function () {{
  var list = document.getElementById('list');
  var count = document.getElementById('count');
  var rows = [].slice.call(list.querySelectorAll('.cat-row'));
  var heads = [].slice.call(list.querySelectorAll('.tier-head'));
  var groups = [].slice.call(list.querySelectorAll('.cat-list'));

  function apply(cat) {{
    rows.forEach(function (r) {{
      r.hidden = !(cat === 'All' || r.getAttribute('data-cat') === cat);
    }});
    // A heading with nothing under it is worse than no heading.
    heads.forEach(function (h, i) {{
      var any = groups[i] && [].slice.call(groups[i].children).some(function (c) {{ return !c.hidden; }});
      h.hidden = !any;
      if (groups[i]) groups[i].hidden = !any;
    }});
    var shown = rows.filter(function (r) {{ return !r.hidden; }}).length;
    count.textContent = cat === 'All'
      ? rows.length + ' in total'
      : shown + ' in ' + cat;
  }}

  list.parentNode.querySelectorAll('.chip').forEach(function (b) {{
    b.addEventListener('click', function () {{
      list.parentNode.querySelectorAll('.chip').forEach(function (x) {{ x.classList.remove('chip-on'); }});
      b.classList.add('chip-on');
      apply(b.getAttribute('data-cat'));
    }});
  }});
  apply('All');
}})();
</script>
""" + FOOTER


def build_legal(slug, title, desc, heading):
    """Privacy and Terms, on the design system.

    The wording is not touched. data/legal/*.html holds the content extracted
    from the old pages; only the shell and the styling change, because the one
    thing you must not do to a legal page is quietly reword it.
    """
    body = io.open(f"data/legal/{slug}.html", encoding="utf-8").read()
    return head(title, desc, f"https://lazyscale.vercel.app/{slug}.html") + nav("") + f"""
<main id="main">
  <section class="sec">
    <div class="wrap" style="max-width:760px">
      <div class="eyebrow">{heading}</div>
      <div class="prose legal">{body}</div>
      <p class="legal-foot">Questions about any of this go to
        <a href="mailto:divyanshus2404@gmail.com">divyanshus2404@gmail.com</a>.</p>
    </div>
  </section>
</main>
""" + FOOTER


if __name__ == "__main__":
    for name, fn in (("index.html", build_index), ("pricing.html", build_pricing),
                     ("about.html", build_about), ("faq.html", build_faq),
                     ("404.html", build_404),
                     ("automations.html", build_automations),
                     ("privacy.html", lambda: build_legal(
                         "privacy", "Privacy · LazyScale",
                         "What LazyScale collects, who else handles it, how long it is kept, and how to have it deleted.",
                         "Privacy")),
                     ("terms.html", lambda: build_legal(
                         "terms", "Terms · LazyScale",
                         "The terms that apply to using this website and to any work LazyScale does for you.",
                         "Terms"))):
        html = fn()
        io.open(name, "w", encoding="utf-8").write(html)
        print(f"wrote {name} ({len(html):,} bytes)")
