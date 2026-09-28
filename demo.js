/* LazyScale interactive demo — runs entirely in the browser.
 *
 * It never calls the model and never records anything, so it costs nothing and
 * works with no API key. It reads whatever is typed and extracts the same things
 * the live Lead Responder does (see api/lead.js): a score, the fields it could
 * pull out, why, a recommended action, and a first-draft reply. The live product
 * runs the real model over api/lead.js and writes the enquiry down before it
 * spends anything. This is a faithful preview of the shape, not the model itself.
 */
(function () {
  'use strict';

  var EXAMPLES = {
    realestate: "Hi, I'm Rahul. Looking for a 3BHK in Whitefield around 1.2 crore. Need to move in within 2 months. Can you call me?",
    agency: "Hey, we're a D2C skincare brand. Our website looks dated and we want a redesign plus better checkout. Budget is roughly 3 lakh, hoping to launch before Diwali.",
    clinic: "Hello, do you do teeth cleaning and whitening? What does it cost and is Saturday morning possible this week?"
  };

  var CITIES = ['whitefield','indiranagar','hsr','koramangala','jayanagar','marathahalli',
    'bengaluru','bangalore','mumbai','delhi','gurgaon','gurugram','noida','pune','hyderabad',
    'chennai','kolkata','ahmedabad','jaipur'];

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  };
  var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var reduced = function () {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  function extractName(t) {
    var m = t.match(/\b(?:i am|i'?m|this is|myself|name is)\s+([A-Z][a-z]+)/i);
    return m ? cap(m[1]) : '';
  }

  function extractBudget(t) {
    var m = t.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lakhs|lac|l|k|thousand)\b/i);
    if (m) {
      var n = m[1], unit = m[2].toLowerCase();
      if (unit === 'crore' || unit === 'cr') return '₹' + n + ' Cr';
      if (unit[0] === 'l') return '₹' + n + ' L';
      if (unit === 'k' || unit === 'thousand') return '₹' + n + 'K';
    }
    var big = t.match(/(?:₹|rs\.?|inr)\s*([\d,]{4,})/i);
    return big ? '₹' + big[1] : '';
  }

  function extractTimeline(t) {
    var m = t.match(/\b(\d+)\s*(day|days|week|weeks|month|months)\b/i);
    if (m) return m[1] + ' ' + m[2].toLowerCase();
    if (/\b(asap|urgent|immediately|right away|today|this week)\b/i.test(t)) return 'As soon as possible';
    if (/\b(before|by)\s+(diwali|christmas|march|april|may|june|july|august|september|october|november|december|new year|month end)\b/i.test(t)) {
      return cap(t.match(/\b(before|by)\s+([a-z ]+)/i)[0].trim());
    }
    return '';
  }

  function extractLocation(t) {
    var low = t.toLowerCase();
    for (var i = 0; i < CITIES.length; i++) {
      if (low.indexOf(CITIES[i]) !== -1) return cap(CITIES[i]);
    }
    return '';
  }

  function analyze(kind, text) {
    var t = text.trim();
    var low = t.toLowerCase();
    var name = extractName(t);
    var budget = extractBudget(t);
    var timeline = extractTimeline(t);
    var location = extractLocation(t);

    var angry = /\b(complaint|refund|angry|terrible|worst|cheated|scam|not happy|disappointed)\b/i.test(t);
    var negotiate = /\b(discount|too expensive|lower price|negotiate|best price)\b/i.test(t);
    var existing = /\b(my order|already paid|invoice|existing|account number|my booking)\b/i.test(t);
    var jobseeker = /\b(hiring|job|internship|resume|vacancy|are you hiring)\b/i.test(t);
    var wantsCall = /\b(call|phone|whatsapp|reach me|contact me|book|appointment|visit|schedule)\b/i.test(t);
    var asksPrice = /\b(cost|price|charge|how much|quote|rate|fees?)\b/i.test(t);

    var why = [];
    var score = 3;
    if (budget) { score += 2; why.push('Budget stated'); }
    if (timeline) { score += 2; why.push('Clear timeline'); }
    if (location) { score += 1; why.push('Location given'); }
    if (t.length > 60 && !jobseeker) { score += 1; why.push('Specific about what they need'); }
    if (wantsCall) { score += 1; why.push('Wants to talk or book'); }
    if (asksPrice && !negotiate) { score += 1; why.push('Asked about price, ready to buy'); }
    if (jobseeker) { score -= 3; }
    if (t.length < 25) { score -= 1; }

    var needsHuman = angry || negotiate || existing;
    var reason = angry ? 'Complaint or unhappy tone'
      : negotiate ? 'Wants to negotiate price'
      : existing ? 'Concerns an existing order or account' : '';

    if (jobseeker && !needsHuman) { reason = 'Looks like a job enquiry, not a customer'; }

    score = Math.max(1, Math.min(10, score));

    var intent = jobseeker ? 'Job seeker'
      : angry ? 'Complaint'
      : negotiate ? 'Price negotiation'
      : kind === 'realestate' ? 'Property enquiry'
      : kind === 'agency' ? 'Project enquiry'
      : 'Service enquiry';

    var verdict, tone;
    if (needsHuman) { verdict = 'Escalated to you'; tone = 'warn'; }
    else if (score >= 8) { verdict = 'Hot lead'; tone = 'hot'; }
    else if (score >= 5) { verdict = 'Worth a reply'; tone = 'warm'; }
    else { verdict = 'Low priority'; tone = 'cool'; }

    var action = needsHuman ? 'A person should take this one'
      : score >= 8 ? 'Call within 15 minutes'
      : score >= 5 ? 'Reply today, then follow up tomorrow'
      : 'Acknowledge, keep it in the queue';

    return {
      kind: kind, name: name, budget: budget, timeline: timeline, location: location,
      intent: intent, score: score, why: why.length ? why : ['Not much to go on yet'],
      needsHuman: needsHuman, reason: reason, verdict: verdict, tone: tone, action: action,
      reply: draftReply(kind, { name: name, budget: budget, timeline: timeline, location: location, asksPrice: asksPrice, wantsCall: wantsCall }, needsHuman)
    };
  }

  function draftReply(kind, f, needsHuman) {
    if (needsHuman) return '';
    var hi = 'Hi ' + (f.name || 'there') + ',\n\n';
    if (kind === 'realestate') {
      return hi + 'Thanks for reaching out. We have options'
        + (f.location ? ' in and around ' + f.location : '')
        + (f.budget ? ' within ' + f.budget : '') + ' that could suit you'
        + (f.timeline ? ', and moving in around ' + f.timeline + ' is workable' : '') + '.\n\n'
        + 'Could you confirm a good time to call? I can shortlist two or three and send them across before we speak.';
    }
    if (kind === 'agency') {
      return hi + 'Thanks for the note. A redesign with a cleaner checkout is well within what we do'
        + (f.budget ? ', and ' + f.budget + ' is a realistic range for that scope' : '') + '.'
        + (f.timeline ? ' ' + cap(f.timeline) + ' is doable if we start soon.' : '') + '\n\n'
        + 'Shall I send two approaches with rough timelines? A short call this week would help me scope it properly.';
    }
    return hi + 'Yes, we offer that.'
      + (f.asksPrice ? ' I will share exact pricing once I know a little more about what you need.' : '')
      + (f.timeline ? ' ' + cap(f.timeline) + ' should be possible.' : ' We usually have slots within the week.') + '\n\n'
      + 'What day suits you? I can hold a slot as soon as you confirm.';
  }

  function cap2(s) { return cap(s); }

  function render(out, a) {
    var fields = [];
    fields.push(['Intent', a.intent]);
    if (a.kind === 'realestate') {
      fields.push(['Location', a.location || 'Not stated']);
      fields.push(['Budget', a.budget || 'Not stated']);
      fields.push(['Timeline', a.timeline ? cap2(a.timeline) : 'Not stated']);
    } else if (a.kind === 'agency') {
      fields.push(['Budget', a.budget || 'Not stated']);
      fields.push(['Timeline', a.timeline ? cap2(a.timeline) : 'Not stated']);
      fields.push(['Contact', a.name || 'Not given']);
    } else {
      fields.push(['Timeline', a.timeline ? cap2(a.timeline) : 'Not stated']);
      fields.push(['Contact', a.name || 'Not given']);
      fields.push(['Budget', a.budget || 'On request']);
    }

    var grid = fields.map(function (f) {
      return '<div class="out-cell"><span class="k">' + esc(f[0]) + '</span>'
        + '<span class="v">' + esc(f[1]) + '</span></div>';
    }).join('');

    var why = a.why.map(function (w) { return '<li>+ ' + esc(w) + '</li>'; }).join('');

    var replyBlock = a.needsHuman
      ? '<div class="out-block"><span class="lab">Why it stopped</span>'
        + '<p class="out-action">' + esc(a.reason) + '</p>'
        + '<p class="out-note">The live version would not answer this one. It goes to you, unanswered, on purpose.</p></div>'
      : '<div class="out-block"><span class="lab">Draft reply</span>'
        + '<div class="out-reply" id="out-reply">' + esc(a.reply) + '</div>'
        + '<div class="out-btns">'
        + '<button class="btn btn-ghost" id="out-edit" type="button">Edit</button>'
        + '<button class="btn" id="out-approve" type="button">Approve &amp; send</button>'
        + '</div>'
        + '<p class="out-note" id="out-msg"></p></div>';

    out.innerHTML =
      '<div class="out-head">'
      + '<span class="score">' + a.score + ' / 10</span>'
      + '<span class="out-verdict">' + esc(a.verdict) + '</span>'
      + '</div>'
      + '<div class="out-grid">' + grid + '</div>'
      + '<div class="out-block"><span class="lab">Why</span><ul class="out-why">' + why + '</ul></div>'
      + '<div class="out-block"><span class="lab">Recommended action</span>'
      + '<p class="out-action">' + esc(a.action) + '</p></div>'
      + replyBlock;

    var edit = $('out-edit'), approve = $('out-approve');
    if (edit) edit.addEventListener('click', function () {
      var r = $('out-reply');
      var on = r.getAttribute('contenteditable') === 'true';
      r.setAttribute('contenteditable', on ? 'false' : 'true');
      edit.textContent = on ? 'Edit' : 'Done';
      if (!on) r.focus();
    });
    if (approve) approve.addEventListener('click', function () {
      var msg = $('out-msg');
      if (msg) msg.textContent = 'In the live version this sends the reply and records the lead. This preview does neither, so nothing left your browser.';
    });
  }

  function run() {
    var out = $('try-out'), stage = $('try-stage'), text = $('try-msg').value;
    if (text.trim().length < 12) {
      stage.textContent = 'Type a line or two first.';
      return;
    }
    var a = analyze(currentKind, text);
    var steps = ['Captured', 'Understood', 'Extracted requirements', 'Scored ' + a.score + '/10', 'Drafted reply'];
    out.hidden = true;

    if (reduced()) {
      stage.textContent = 'Done.';
      render(out, a); out.hidden = false;
      return;
    }
    var run = $('try-run');
    run.disabled = true;
    var i = 0;
    (function tick() {
      if (i < steps.length) {
        stage.textContent = steps[i] + ' …';
        i++;
        setTimeout(tick, 460);
      } else {
        stage.textContent = 'Done in under a second.';
        render(out, a);
        out.hidden = false;
        run.disabled = false;
      }
    })();
  }

  var currentKind = 'realestate';

  document.addEventListener('DOMContentLoaded', function () {
    var msg = $('try-msg');
    if (!msg) return;
    msg.value = EXAMPLES[currentKind];

    Array.prototype.forEach.call(document.querySelectorAll('.pick'), function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.pick').forEach(function (b) { b.classList.remove('pick-on'); });
        btn.classList.add('pick-on');
        currentKind = btn.getAttribute('data-ex');
        msg.value = EXAMPLES[currentKind];
        var out = $('try-out'); if (out) out.hidden = true;
        var stage = $('try-stage'); if (stage) stage.textContent = '';
      });
    });

    var runBtn = $('try-run');
    if (runBtn) runBtn.addEventListener('click', run);
  });
})();
