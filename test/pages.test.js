// Two bugs shipped to production from this repository and stayed there for
// days. Both were invisible to a reader and obvious to a parser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const PAGES = ['index.html', 'app.html', 'automations.html', 'details.html', 'setup.html', 'privacy.html'];

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
