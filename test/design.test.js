// The design system, enforced.
//
// Every version of this site has drifted the same way: a size here, a colour
// there, a new bordered box, and six weeks later it reads as cluttered without
// any single change being wrong. The page had eighteen distinct font sizes
// before these tests existed.
//
// The rule is simple — if you need a value that is not in the scale, change the
// scale, do not add an exception.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const css = readFileSync('_sys.css', 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const body = strip(css);

test('every font-size comes from the type scale', () => {
  const declared = [...body.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const offenders = declared.filter((v) => !v.startsWith('var(--t-') && !v.startsWith('inherit'));
  assert.deepEqual(offenders, [], `off-scale sizes: ${offenders.join(', ')}`);
});

test('the type scale stays small', () => {
  const steps = [...body.matchAll(/--t-[a-z0-9]+:/g)].length;
  assert.ok(steps <= 10, `${steps} type steps — more than ten and the page stops having a voice`);
});

test('spacing comes from the spacing scale', () => {
  // Padding and margin should reference --s tokens. A handful of optical
  // one-offs inside small components are allowed; wholesale drift is not.
  const decls = [...body.matchAll(/(?:padding|margin)(?:-(?:top|bottom|left|right|block|inline))?:\s*([^;}]+)/g)]
    .map((m) => m[1].trim())
    .filter((v) => !v.includes('var(--s') && !/^(0|auto|0 auto|inherit)$/.test(v));
  assert.ok(decls.length <= 30, `${decls.length} hand-set spacing values — the scale is being bypassed`);
});

test('corners use the radius tokens', () => {
  const radii = [...body.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const offenders = radii.filter((v) => !v.includes('var(--r') && v !== '50%' && !/^0/.test(v));
  assert.deepEqual(offenders, [], `hand-set radii: ${offenders.join(', ')}`);
});

test('the accent is spent in a few places, not everywhere', () => {
  // An accent used thirty times is texture, not an accent. Counted outside the
  // token definitions themselves.
  const uses = [...body.matchAll(/var\(--accent[a-z-]*\)/g)].length;
  assert.ok(uses <= 12, `${uses} accent uses — past a dozen it stops meaning anything`);
});

test('colours are tokens, not literals', () => {
  // Hex values belong in the :root blocks. Anywhere else they escape theming
  // and break one of the two themes silently.
  const afterRoot = body.slice(body.indexOf('* { box-sizing'));
  const hexes = [...afterRoot.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  assert.deepEqual(hexes, [], `literal colours outside the token blocks: ${hexes.join(', ')}`);
});

test('pages carry no inline styling that dodges the system', () => {
  const pages = readdirSync('.').filter((f) => /^(index|pricing|about|faq|404)\.html$/.test(f));
  for (const page of pages) {
    const html = readFileSync(page, 'utf8');
    const inline = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
    for (const decl of inline) {
      const px = [...decl.matchAll(/(font-size|padding|margin[a-z-]*):\s*([0-9.]+px)/g)];
      assert.deepEqual(px.map((m) => m[0]), [],
        `${page} sets ${px.map((m) => m[0]).join(', ')} inline — use a token`);
    }
  }
});
