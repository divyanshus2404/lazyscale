/* LazyScale product demo. Runs entirely in the browser.
 *
 * No model call, nothing recorded, no API key: it costs nothing and always
 * works. The live product runs the same shape through api/lead.js.
 *
 * Layout of this file:
 *   1. Data           scenarios, inbox leads, default business rules
 *   2. Analyzer       the ONE seam to replace with a real API (see apiAnalyzer)
 *   3. Components     EnquiryInput, AnalysisProgress, LeadAnalysis, AIResponse,
 *                     InboxPreview, BusinessRules
 *   4. LazyScaleDemo  wires them together
 */
(function () {
  'use strict';

  // ── helpers ────────────────────────────────────────────────────────────────
  var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function reducedMotion() {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function fmtLakh(l) { return l >= 100 ? '₹' + (+(l / 100).toFixed(2)) + ' Cr' : '₹' + l + 'L'; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ── 1. Data ────────────────────────────────────────────────────────────────
  // Each scenario carries a fixed, hand-written result so the demo reads
  // exactly as intended. `budgetL` (in lakhs) and `location` are what the
  // business rules are checked against.
  var SCENARIOS = {
    realestate: {
      kind: 'realestate', label: 'Real Estate',
      text: "Hi, I'm Rahul. I'm looking for a 3BHK in Whitefield around ₹1.2 crore. I need it within the next 2 months.",
      result: {
        score: 9, name: 'Rahul',
        fields: [['Customer intent', 'Buying a 3BHK'], ['Location', 'Whitefield'], ['Budget', '₹1.2 Cr'], ['Timeline', '2 months']],
        budgetL: 120, location: 'Whitefield',
        why: ['Clear requirement', 'Budget provided', 'Specific location', 'Short purchase timeline'],
        action: 'Call within 15 minutes',
        reply: "Hi Rahul, thanks for reaching out. We have several 3BHK options in Whitefield that may fit your requirements. I'd be happy to share the available options and arrange a viewing. Would you be available for a quick call today?"
      }
    },
    agency: {
      kind: 'agency', label: 'Agency',
      text: 'Need a website for my startup. Budget is around ₹2 lakh. Can you deliver it this month?',
      result: {
        score: 8, name: '',
        fields: [['Customer intent', 'New website'], ['Project', 'Startup website'], ['Budget', '₹2L'], ['Timeline', 'This month']],
        budgetL: 2, location: '',
        why: ['Clear requirement', 'Budget provided', 'Short timeline, ready to start'],
        action: 'Reply within the hour and book a scoping call',
        reply: "Hi, thanks for getting in touch. A startup website within ₹2 lakh is very doable, and this month can work if we start this week. Could you share what the site needs to do and a few sites you like? I can then send a short plan and set up a 20 minute call."
      }
    },
    clinic: {
      kind: 'clinic', label: 'Clinic',
      text: 'Do you have appointments available tomorrow for a general consultation?',
      result: {
        score: 6, name: '',
        fields: [['Customer intent', 'Book a consultation'], ['Service', 'General consultation'], ['Timeline', 'Tomorrow'], ['Contact', 'Not given']],
        budgetL: null, location: '',
        why: ['Clear service requested', 'Wants it tomorrow'],
        against: ['No name or contact details'],
        action: "Reply with tomorrow's open slots",
        reply: "Hi, thanks for getting in touch. Yes, we have general consultation slots tomorrow morning and late afternoon. Could you share your name and a preferred time? I'll hold the slot for you as soon as you confirm."
      }
    }
  };

  // Inbox entries point at a scenario, or carry their own text and result.
  var INBOX = [
    { id: 'rahul', who: 'Rahul Sharma', sub: '3BHK · Whitefield · ₹1.2 Cr', scenario: 'realestate' },
    {
      id: 'priya', who: 'Priya Mehta', sub: 'Website redesign', kind: 'agency',
      text: 'Hi, how much would a website redesign cost? We are a 6 person design studio.',
      result: {
        score: 6, name: 'Priya',
        fields: [['Customer intent', 'Website redesign'], ['Company', '6 person studio'], ['Budget', 'Not stated'], ['Timeline', 'Not stated']],
        budgetL: null, location: '',
        why: ['Clear requirement', 'Asked about price'],
        against: ['No budget or timeline yet'],
        action: 'Reply today with a price range, follow up tomorrow',
        reply: "Hi Priya, thanks for reaching out. Redesigns for a studio your size usually depend on the number of pages and whether you need a CMS. Could you share your current site and when you'd like it live? I can send a clear quote after that."
      }
    },
    {
      id: 'anon', who: 'Anonymous', sub: 'General enquiry', kind: 'agency',
      text: 'what do you do exactly',
      result: {
        score: 2, name: '',
        fields: [['Customer intent', 'Unclear'], ['Budget', 'Not stated'], ['Timeline', 'Not stated'], ['Contact', 'Not given']],
        budgetL: null, location: '',
        why: [], against: ['No clear requirement', 'No contact details'],
        forceHuman: 'Too vague to answer well, so a person decides.',
        action: '', reply: ''
      }
    }
  ];

  var RULES = {
    realestate: { minBudgetL: 50, budgetOptions: [0, 25, 50, 100, 200],
                  locations: { Whitefield: true, Indiranagar: true, HSR: true, Koramangala: false } },
    agency:     { minBudgetL: 1, budgetOptions: [0, 1, 2, 5, 10], locations: null },
    clinic:     { minBudgetL: null, budgetOptions: null, locations: null },
    escalate: [
      { label: 'Complaints', on: true, re: /\b(complain|complaint|terrible|worst|unacceptable|not happy|disappointed|angry|cheated)\b/i },
      { label: 'Refund requests', on: true, re: /\b(refund|money back|chargeback)\b/i },
      { label: 'Price negotiations', on: true, re: /\b(discount|negotiate|too expensive|best price|lower (the )?price|reduce (the )?price)\b/i },
      { label: 'Existing customers', on: true, re: /\b(my order|already paid|my booking|invoice|existing customer|my account)\b/i }
    ]
  };

  // ── 2. Analyzer ────────────────────────────────────────────────────────────
  // Contract: analyze(text, kind, rules) -> Promise<Analysis>.
  //
  // mockAnalyzer returns the scenario result when the text is an example and
  // otherwise reads the text with simple rules. Business rules are applied on
  // top either way, so changing a rule visibly changes the outcome.
  //
  // To go live, set `analyzer = apiAnalyzer`. It calls the existing preview
  // mode of api/lead.js, which never records and never emails.
  var mockAnalyzer = {
    analyze: function (text, kind, rules) {
      var t = text.trim(), found = null;
      Object.keys(SCENARIOS).forEach(function (k) { if (SCENARIOS[k].text === t) found = SCENARIOS[k].result; });
      INBOX.forEach(function (l) { if (l.text === t) found = l.result; });
      return Promise.resolve(applyRules(clone(found || readText(t, kind)), t, kind, rules));
    }
  };

  var apiAnalyzer = {
    analyze: function (text, kind, rules) {
      return fetch('/api/lead', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preview: true, message: text })
      }).then(function (r) { return r.json(); }).then(function (p) {
        if (!p.ok) throw new Error(p.error || 'Could not analyze');
        return applyRules({
          score: p.score, name: '', fields: [['Customer intent', p.summary]],
          budgetL: null, location: '', why: [], against: [],
          forceHuman: p.needsHuman ? (p.escalationReason || 'Needs a person.') : '',
          action: '', reply: p.reply || ''
        }, text, kind, rules);
      });
    }
  };

  var analyzer = mockAnalyzer;
  void apiAnalyzer;

  function readText(t, kind) {
    var name = (t.match(/\b(?:I am|I'?m|this is|myself|name is)\s+([A-Z][a-z]+)/) || [])[1] || '';
    var budgetL = null, budget = '';
    var m = t.match(/(\d+(?:\.\d+)?)\s*(crore|cr|lakhs?|lacs?|l)\b/i);
    if (m) {
      var n = parseFloat(m[1]);
      budgetL = /^c/i.test(m[2]) ? n * 100 : n;
      budget = fmtLakh(budgetL);
    }
    var tm = t.match(/\b(\d+)\s*(days?|weeks?|months?)\b/i);
    var soon = t.match(/\b(asap|urgent|immediately|today|tomorrow|this week|this month)\b/i);
    var timeline = tm ? tm[1] + ' ' + tm[2].toLowerCase() : soon ? cap(soon[1].toLowerCase()) : '';
    var loc = '';
    ['Whitefield', 'Indiranagar', 'HSR', 'Koramangala', 'Jayanagar', 'Bengaluru', 'Bangalore', 'Mumbai', 'Pune', 'Delhi', 'Hyderabad']
      .some(function (c) { if (t.toLowerCase().indexOf(c.toLowerCase()) !== -1) { loc = c; return true; } return false; });

    var why = [], against = [], score = 3;
    if (t.length > 50) { score += 1; why.push('Specific about what they need'); } else { against.push('Very little detail'); }
    if (budget) { score += 2; why.push('Budget provided'); } else { against.push('No budget stated'); }
    if (timeline) { score += 2; why.push('Timeline given'); }
    if (loc) { score += 1; why.push('Specific location'); }
    if (/\b(call|visit|book|appointment|meet|schedule)\b/i.test(t)) { score += 1; why.push('Wants to talk or book'); }
    if (/\b(hiring|internship|job|resume|vacancy)\b/i.test(t)) { score = 1; against.push('Looks like a job enquiry'); }

    var intent = kind === 'realestate' ? 'Property enquiry' : kind === 'clinic' ? 'Appointment enquiry' : 'Project enquiry';
    var fields = [['Customer intent', intent]];
    if (kind === 'realestate') fields.push(['Location', loc || 'Not stated']);
    fields.push(['Budget', budget || 'Not stated'], ['Timeline', timeline || 'Not stated']);
    if (kind !== 'realestate') fields.push(['Contact', name || 'Not given']);

    var hi = 'Hi ' + (name || 'there') + ', thanks for reaching out. ';
    var reply = kind === 'realestate'
      ? hi + 'We have options' + (loc ? ' in ' + loc : '') + (budget ? ' around ' + budget : '') + ' that may suit you. Could you share a good time for a quick call? I can shortlist a few before we speak.'
      : kind === 'clinic'
        ? hi + 'We can help with that. Could you share your name and a preferred day and time? I will confirm a slot as soon as I hear back.'
        : hi + 'This sounds like something we can take on. Could you share a little more about the scope' + (timeline ? '' : ' and your timeline') + '? I can then send a short plan and a rough estimate.';

    return {
      score: Math.max(1, Math.min(10, score)), name: name, fields: fields,
      budgetL: budgetL, location: loc, why: why, against: against, action: '', reply: reply
    };
  }

  function actionFor(score) {
    return score >= 8 ? 'Call within 15 minutes' : score >= 5 ? 'Reply today, follow up tomorrow' : 'Acknowledge, keep it in the queue';
  }

  function applyRules(r, text, kind, rules) {
    var orig = r.score;
    r.against = r.against || [];
    r.rulesUsed = [];
    var kr = rules[kind] || {};

    if (kr.minBudgetL && r.budgetL != null) {
      if (r.budgetL >= kr.minBudgetL) r.rulesUsed.push('Budget meets your ' + fmtLakh(kr.minBudgetL) + ' minimum');
      else { r.score -= 3; r.against.push('Below your minimum budget of ' + fmtLakh(kr.minBudgetL)); }
    }
    if (kr.locations && r.location) {
      var match = Object.keys(kr.locations).filter(function (l) { return l.toLowerCase() === r.location.toLowerCase(); })[0];
      if (match && kr.locations[match]) r.rulesUsed.push(match + ' is a preferred location');
      else { r.score -= 2; r.against.push(r.location + ' is not one of your preferred locations'); }
    }

    var hit = rules.escalate.filter(function (e) { return e.on && e.re.test(text); })[0];
    r.needsHuman = !!(hit || r.forceHuman);
    r.reason = hit ? 'Your rules say a person handles ' + hit.label.toLowerCase() + '.' : (r.forceHuman || '');
    if (hit) r.rulesUsed.push('Always escalate ' + hit.label.toLowerCase());

    r.score = Math.max(1, Math.min(10, r.score));
    r.tone = r.needsHuman ? 'need' : r.score >= 8 ? 'hot' : r.score >= 5 ? 'warm' : 'cool';
    r.verdict = r.needsHuman ? 'Needs you' : r.score >= 8 ? 'Hot lead' : r.score >= 5 ? 'Warm lead' : 'Low priority';
    if (r.needsHuman) { r.action = 'Owner reviews before anything is sent'; r.reply = ''; }
    else if (!r.action || r.score !== orig) r.action = actionFor(r.score);
    return r;
  }

  // ── 3. Components ──────────────────────────────────────────────────────────

  // EnquiryInput: example chips, the enquiry box and the analyze button.
  function EnquiryInput(mount, opts) {
    mount.innerHTML =
      '<div class="try-pick" role="group" aria-label="Load an example enquiry">' +
      Object.keys(SCENARIOS).map(function (k, i) {
        return '<button class="pick' + (i === 0 ? ' pick-on' : '') + '" type="button" data-kind="' + k + '" aria-pressed="' + (i === 0) + '">' + esc(SCENARIOS[k].label) + '</button>';
      }).join('') +
      '</div>' +
      '<textarea id="demo-msg" class="try-text" rows="4" spellcheck="false" aria-label="Customer enquiry"></textarea>' +
      '<div class="try-actions">' +
      '<button class="btn" id="demo-run" type="button">Analyze enquiry →</button>' +
      '<span class="demo-note" id="demo-hint" aria-live="polite"></span>' +
      '</div>';

    var box = mount.querySelector('#demo-msg');
    var btn = mount.querySelector('#demo-run');
    var hint = mount.querySelector('#demo-hint');
    var chips = mount.querySelectorAll('.pick');
    var IDLE = 'Or paste your own. Ctrl + Enter works too.';
    hint.textContent = IDLE;

    function select(kind) {
      each(chips, function (c) {
        var on = c.getAttribute('data-kind') === kind;
        c.classList.toggle('pick-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
    }
    each(chips, function (c) {
      c.addEventListener('click', function () {
        var kind = c.getAttribute('data-kind');
        select(kind);
        box.value = SCENARIOS[kind].text;
        opts.onKind(kind);
      });
    });
    btn.addEventListener('click', function () { opts.onSubmit(box.value); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); opts.onSubmit(box.value); }
    });

    return {
      set: function (text, kind) { box.value = text; if (kind) select(kind); },
      busy: function (on) { btn.disabled = on; btn.textContent = on ? 'Analyzing…' : 'Analyze enquiry →'; },
      hint: function (msg) { hint.textContent = msg || IDLE; }
    };
  }

  // AnalysisProgress: five steps animating in, about 2.8 seconds in total.
  function AnalysisProgress(mount) {
    var STEPS = ['Capturing enquiry', 'Understanding customer intent', 'Extracting requirements', 'Scoring lead', 'Drafting response'];
    var timer = null;
    return {
      run: function (done) {
        clearTimeout(timer);
        if (reducedMotion()) { mount.innerHTML = ''; done(); return; }
        mount.innerHTML = '<ol class="prog" aria-label="Analysis progress">' + STEPS.map(function (s) {
          return '<li><span class="mk"></span>' + esc(s) + '</li>';
        }).join('') + '</ol>';
        var items = mount.querySelectorAll('li'), i = 0;
        (function step() {
          if (i > 0) { items[i - 1].className = 'done'; items[i - 1].querySelector('.mk').innerHTML = TICK; }
          if (i < items.length) { items[i].className = 'on'; i++; timer = setTimeout(step, 480); }
          else timer = setTimeout(function () { mount.innerHTML = ''; done(); }, 350);
        })();
      },
      clear: function () { clearTimeout(timer); mount.innerHTML = ''; }
    };
  }

  // LeadAnalysis: the scored card, as markup.
  function LeadAnalysis(a) {
    var fields = a.fields.map(function (f) {
      return '<div><span class="lab">' + esc(f[0]) + '</span><span class="v">' + esc(f[1]) + '</span></div>';
    }).join('');
    var why = a.why.map(function (w) { return '<li><span class="mk">✓</span>' + esc(w) + '</li>'; }).join('') +
      a.against.map(function (w) { return '<li class="neg"><span class="mk neg">–</span>' + esc(w) + '</li>'; }).join('');
    var rules = a.rulesUsed.length ? '<p class="rules-used">Your rules: ' + a.rulesUsed.map(esc).join(' · ') + '</p>' : '';
    return '<div class="res-head">' +
        '<div><span class="lab">Lead analysis</span>' +
        '<span class="verdict t-' + a.tone + '"><span class="dot"></span>' + esc(a.verdict) + '</span></div>' +
        '<span class="res-score">' + a.score + '<small>/10</small></span>' +
      '</div>' +
      '<div class="fields">' + fields + '</div>' +
      '<div><span class="lab">Why this score?</span><ul class="why">' + why + '</ul>' + rules + '</div>' +
      '<div><span class="lab">Recommended action</span><p class="action">' + esc(a.action) + '</p>' +
      (a.needsHuman ? '<p class="demo-note">' + esc(a.reason) + ' No reply is drafted, on purpose.</p>' : '') +
      '</div>';
  }

  // AIResponse: the draft, with Edit and Approve & Send. Appends into `mount`.
  function AIResponse(mount, a) {
    if (a.needsHuman) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<span class="lab">AI draft response</span>' +
      '<div class="reply" role="textbox" aria-multiline="true" aria-label="Draft reply">' + esc(a.reply) + '</div>' +
      '<div class="reply-btns">' +
      '<button class="btn btn-ghost" type="button" data-act="edit">Edit</button>' +
      '<button class="btn" type="button" data-act="send">Approve &amp; Send</button>' +
      '</div>';
    mount.appendChild(wrap);
    var reply = wrap.querySelector('.reply');
    var edit = wrap.querySelector('[data-act=edit]');
    var btns = wrap.querySelector('.reply-btns');
    edit.addEventListener('click', function () {
      var on = reply.getAttribute('contenteditable') === 'true';
      reply.setAttribute('contenteditable', on ? 'false' : 'true');
      edit.textContent = on ? 'Edit' : 'Done editing';
      if (!on) reply.focus();
    });
    wrap.querySelector('[data-act=send]').addEventListener('click', function () {
      reply.setAttribute('contenteditable', 'false');
      btns.innerHTML = '<span class="approved" role="status"><span class="t-hot"><span class="dot"></span></span>✓ Response approved</span>' +
        '<span class="demo-note">In the live product this sends the reply and logs it. Here, nothing left your browser.</span>';
    });
  }

  // InboxPreview: a small queue. Clicking a lead opens it in the main panel.
  function InboxPreview(mount, onOpen) {
    mount.innerHTML = '<span class="lab">LazyScale inbox</span>' +
      '<div class="inbox-stats">' +
      '<div><b>12</b><span>enquiries today</span></div>' +
      '<div><b>8</b><span>qualified</span></div>' +
      '<div><b>3</b><span>hot leads</span></div>' +
      '</div>' +
      '<ul class="inbox-list"></ul>';
    var list = mount.querySelector('.inbox-list');
    INBOX.forEach(function (l) {
      var src = l.scenario ? SCENARIOS[l.scenario] : l;
      var r = src.result;
      var need = !!r.forceHuman;
      var tone = need ? 'need' : r.score >= 8 ? 'hot' : r.score >= 5 ? 'warm' : 'cool';
      var li = document.createElement('li');
      li.innerHTML = '<button class="inbox-item" type="button">' +
        '<span class="sc t-' + tone + '"><span class="dot"></span>' + r.score + '/10</span>' +
        '<b>' + esc(l.who) + '</b>' +
        '<span class="sub">' + esc(l.sub) + '</span>' +
        '<span class="st">' + (need ? 'Needs human review' : 'AI draft ready') + '</span>' +
        '</button>';
      var b = li.firstChild;
      b.addEventListener('click', function () {
        each(list.querySelectorAll('.inbox-item'), function (x) { x.classList.toggle('sel', x === b); });
        onOpen(src.text, src.kind);
      });
      list.appendChild(li);
    });
    return { clearSelection: function () { each(list.querySelectorAll('.sel'), function (x) { x.classList.remove('sel'); }); } };
  }

  // BusinessRules: editable rules for the selected business type.
  function BusinessRules(mount, rules, onChange) {
    var kind = 'realestate';
    function render() {
      var kr = rules[kind];
      var html = '<span class="lab">My business rules · ' + esc(SCENARIOS[kind].label) + '</span><div class="rules">';
      if (kr.budgetOptions) {
        html += '<div><label class="lab" for="rule-budget">Minimum budget</label>' +
          '<select id="rule-budget" class="rule-sel">' + kr.budgetOptions.map(function (v) {
            return '<option value="' + v + '"' + (v === kr.minBudgetL ? ' selected' : '') + '>' + (v === 0 ? 'No minimum' : fmtLakh(v)) + '</option>';
          }).join('') + '</select></div>';
      }
      if (kr.locations) {
        html += '<div><span class="lab">Preferred locations</span><div class="rule-chips" role="group" aria-label="Preferred locations">' +
          Object.keys(kr.locations).map(function (l) {
            return '<button type="button" class="pick' + (kr.locations[l] ? ' pick-on' : '') + '" data-loc="' + l + '" aria-pressed="' + kr.locations[l] + '">' + esc(l) + '</button>';
          }).join('') + '</div></div>';
      }
      html += '<div><span class="lab">Always escalate</span><div class="rule-list">' +
        rules.escalate.map(function (e, i) {
          return '<label class="rule-tog"><input type="checkbox" data-esc="' + i + '"' + (e.on ? ' checked' : '') + '>' + esc(e.label) + '</label>';
        }).join('') + '</div></div>';
      html += '<p class="demo-note">Change a rule and the open enquiry is re-scored against it.</p></div>';
      mount.innerHTML = html;

      var sel = mount.querySelector('#rule-budget');
      if (sel) sel.addEventListener('change', function () { kr.minBudgetL = +sel.value; onChange(); });
      each(mount.querySelectorAll('[data-loc]'), function (b) {
        b.addEventListener('click', function () {
          var l = b.getAttribute('data-loc');
          kr.locations[l] = !kr.locations[l];
          b.classList.toggle('pick-on', kr.locations[l]);
          b.setAttribute('aria-pressed', String(kr.locations[l]));
          onChange();
        });
      });
      each(mount.querySelectorAll('[data-esc]'), function (c) {
        c.addEventListener('change', function () { rules.escalate[+c.getAttribute('data-esc')].on = c.checked; onChange(); });
      });
    }
    render();
    return { show: function (k) { if (k !== kind) { kind = k; render(); } } };
  }

  // ── 4. LazyScaleDemo ───────────────────────────────────────────────────────
  function LazyScaleDemo(root) {
    var state = { kind: 'realestate', text: '', analyzed: false, run: 0 };
    var result = root.querySelector('#demo-result');
    var progress = AnalysisProgress(root.querySelector('#demo-progress'));
    var input, rules, inbox;

    function reset() { state.run++; progress.clear(); result.innerHTML = ''; state.analyzed = false; input.busy(false); input.hint(); }

    function analyze(text, animate) {
      if (text.trim().length < 10) { input.hint('Type a line or two first.'); return; }
      var run = ++state.run;
      state.text = text;
      input.busy(true);
      if (animate) result.innerHTML = '';
      var p = analyzer.analyze(text, state.kind, RULES);
      function show() {
        p.then(function (a) {
          if (run !== state.run) return;
          result.innerHTML = '<div class="res">' + LeadAnalysis(a) + '</div>';
          AIResponse(result.firstChild, a);
          state.analyzed = true;
          input.hint('Done. Now try changing a business rule.');
        }).catch(function () {
          if (run !== state.run) return;
          result.innerHTML = '<p class="demo-note">Could not analyze that one. In the live product it would go to a person.</p>';
        }).then(function () { if (run === state.run) input.busy(false); });
      }
      if (animate) progress.run(show); else { progress.clear(); show(); }
    }

    input = EnquiryInput(root.querySelector('#demo-input'), {
      onKind: function (k) { state.kind = k; rules.show(k); inbox.clearSelection(); reset(); },
      onSubmit: function (text) { inbox.clearSelection(); analyze(text, true); }
    });
    rules = BusinessRules(root.querySelector('#demo-rules'), RULES, function () {
      if (state.analyzed) analyze(state.text, false);
    });
    inbox = InboxPreview(root.querySelector('#demo-inbox'), function (text, kind) {
      state.kind = kind;
      input.set(text, kind);
      rules.show(kind);
      analyze(text, false);
      if (window.innerWidth < 960) root.querySelector('.demo-main').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });

    input.set(SCENARIOS.realestate.text, 'realestate');
  }

  function start() {
    var root = document.getElementById('lazyscale-demo');
    if (root) LazyScaleDemo(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
