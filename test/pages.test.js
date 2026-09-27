// Two bugs shipped to production from this repository and stayed there for
// days. Both were invisible to a reader and obvious to a parser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const PAGES = ['index.html', 'pricing.html', 'about.html', 'full.html', 'app.html', 'automations.html', 'details.html', 'setup.html', 'privacy.html'];

for (const page of PAGES) {
  const html = readFileSync(page, 'utf8');

  test(`${page}: exactly one favicon link`, () => {
    // A non-greedy regex once replaced a favicon and stopped at the first ">"
    // inside the SVG data URI, leaving the old tag's tail as live markup. A
    // stray '"> rendered mid-page on four pages for several days.
    const icons = html.match(/<link[^>]*rel=["']?(shortcut )?icon/gi) || [];
    assert.equal(icons.length, 1, `found ${icons.length}`);
  });

  test(`${page}: no orphan markup left by an edit`, () => {
    const body = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    assert.equal(/^\s*["']>/m.test(body), false, 'a line starts with a stray quote-and-angle-bracket');
    assert.equal(body.includes('">>'), false);
  });

  test(`${page}: tags are balanced`, () => {
    for (const tag of ['script', 'style', 'head', 'body', 'html']) {
      const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
      const close = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
      assert.equal(open, close, `${tag}: ${open} open, ${close} close`);
    }
  });

  test(`${page}: declares a doctype and a language`, () => {
    // Without these the browser renders in quirks mode, which this site shipped
    // in until it was measured.
    assert.match(html.slice(0, 120).toLowerCase(), /<!doctype html>/);
    assert.match(html, /<html[^>]*\slang=/i);
  });
}

test('every brand SVG parses', async () => {
  // A bare "&" in one label once produced two files browsers refused to draw,
  // and a broken <img> in a README reads as a missing file, not a typo.
  const { XMLParser } = await import('node:util').then(() => ({ XMLParser: null })).catch(() => ({ XMLParser: null }));
  const files = readdirSync('brand').filter((f) => f.endsWith('.svg'));
  assert.ok(files.length >= 8, `only ${files.length} SVGs`);
  for (const f of files) {
    const svg = readFileSync(`brand/${f}`, 'utf8');
    // No XML parser in core, so check the two things that actually broke:
    // unescaped ampersands, and unbalanced tags.
    const bareAmp = svg.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/gi) || [];
    assert.equal(bareAmp.length, 0, `${f}: ${bareAmp.length} unescaped &`);
    assert.equal((svg.match(/<svg[\s>]/g) || []).length, 1, `${f}: svg root`);
    assert.equal((svg.match(/<\/svg>/g) || []).length, 1, `${f}: svg close`);
  }
});

test('no animated SVG hides its own content', () => {
  // The banner and the terminal both shipped, briefly, animating content in
  // from opacity 0 — so a paused frame, a preview thumbnail or a renderer that
  // ignores CSS showed an empty rectangle. Decoration may fade; words may not.
  const DECORATIVE = ['.dot', '.pulse', '.caret', '.glow'];
  for (const f of readdirSync('brand').filter((x) => x.endsWith('.svg'))) {
    const svg = readFileSync(`brand/${f}`, 'utf8');
    const style = (svg.match(/<style>([\s\S]*?)<\/style>/) || [])[1];
    if (!style) continue;
    for (const rule of style.split('}')) {
      if (!/opacity:\s*0\b/.test(rule)) continue;
      const isKeyframeStep = /%/.test(rule) || /\bfrom\b|\bto\b/.test(rule);
      const decorative = DECORATIVE.some((d) => rule.includes(d));
      assert.ok(
        isKeyframeStep || decorative,
        `${f}: a base rule sets opacity 0 on something that is not decorative:\n${rule.trim().slice(0, 120)}`
      );
    }
  }
});

test('the generated pages match their builder', async () => {
  // index, pricing and about are written by _build.py. Editing the HTML by hand
  // works until the next build silently throws it away.
  const { execFileSync } = await import('node:child_process');
  const generated = ['index.html', 'pricing.html', 'about.html', 'faq.html', '404.html', 'automations.html', 'privacy.html', 'terms.html'];
  const before = generated.map((f) => readFileSync(f, 'utf8'));
  execFileSync('python3', ['_build.py'], { stdio: 'pipe' });
  const after = generated.map((f) => readFileSync(f, 'utf8'));
  for (let i = 0; i < before.length; i++) {
    assert.equal(after[i], before[i], 'a generated page was edited by hand — change _build.py instead');
  }
});

test('nothing claims a customer we do not have', () => {
  // Every version of this site has drifted toward invented proof. These are the
  // phrases that showed up last time.
  // Positive claims only. The first version of this test flagged the word
  // "testimonials" inside the sentence saying there are none, which is the
  // opposite of the thing worth catching.
  const banned = [/trusted by \d/i, /\d+\+? (happy )?(clients|customers)/i,
                  /what our (clients|customers) say/i, /join \d[\d,]* businesses/i,
                  /rated \d(\.\d)? stars/i, /loved by/i];
  for (const page of ['index.html', 'pricing.html', 'about.html']) {
    const html = readFileSync(page, 'utf8');
    for (const re of banned) {
      assert.equal(re.test(html), false, `${page} matches ${re}`);
    }
  }
});

test('no page claims we do not store data, or an audit we have not had', () => {
  // api/inbound.js records name, email, phone and message for every enquiry —
  // capture-before-spend is the whole design. The old FAQ said the opposite,
  // in the visible copy and in the FAQPage structured data Google reads.
  const lies = [/never store your customer data/i, /we do not store (any )?customer data/i,
                /SOC ?2 (certified|compliant)/i, /follow SOC ?2 practices/i,
                /live in 48 hours/i];
  for (const page of readdirSync('.').filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(page, 'utf8');
    for (const re of lies) assert.equal(re.test(html), false, `${page} matches ${re}`);
  }
});

test('the copy does not read as machine-written', () => {
  // Em dashes wedged mid-sentence are the loudest tell, and there were fifty
  // across the site. The rest of this list is the vocabulary that shows up in
  // generated marketing copy and nowhere else.
  const tells = [
    { re: /—/, why: 'em dash: split the sentence in two instead' },
    { re: /\bit'?s not just\b/i, why: '"it\'s not just X, it\'s Y"' },
    { re: /\bisn'?t just\b/i, why: '"isn\'t just X"' },
    { re: /\bhere'?s the thing\b/i, why: '"here\'s the thing"' },
    { re: /\b(seamless|robust|game-?changer|cutting-?edge|revolutioni[sz]e)\b/i, why: 'vendor adjective' },
    { re: /\b(empower|elevate|unlock|supercharge|delve)\b/i, why: 'generated-copy verb' },
    { re: /\bin today'?s .{0,20}(world|landscape|market)\b/i, why: '"in today\'s fast-moving world"' },
  ];
  for (const page of ['index.html', 'pricing.html', 'about.html', 'faq.html', '404.html', 'automations.html', 'privacy.html', 'terms.html']) {
    const html = readFileSync(page, 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    for (const { re, why } of tells) {
      assert.equal(re.test(text), false, `${page}: ${why}`);
    }
  }
});
