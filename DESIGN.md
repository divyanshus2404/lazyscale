# The design system

One accent, one type scale, one spacing scale. It lives in `_sys.css` and every
page is generated from it by `_build.py`, so the pages cannot drift apart.

```bash
python3 _build.py      # after editing _sys.css, _head.py or _build.py
npm test               # the rules below are enforced, not suggested
```

## The rules

**Type: nine steps, no exceptions.** `--t-micro` 12, `--t-meta` 13, `--t-sm` 14,
`--t-body` 16, `--t-lede` 18, `--t-h3` 20, `--t-num` 28, plus two clamped
heading sizes. The page carried **eighteen** distinct sizes before this existed,
six of them half-pixel, and that is what read as clutter — not any single
element being wrong.

**Spacing comes from `--s1`…`--s9`.** 4, 8, 12, 16, 24, 32, 48, 72, 120.

**Corners come from `--r-xs`, `--r`, `--r-lg`, `--r-pill`.** Nothing else.

**Colours are tokens.** No hex literal outside the `:root` blocks — one escaped
once and broke a theme silently.

**The accent is spent under a dozen times.** It is currently in six places: the
mark, the dark-mode button, the status pips, the qualification chip, the one
highlighted step, and the pricing badge. Every tick on every card used to be
lime, which turns an accent into texture.

**Lime is a fill, never text.** 1.32:1 on white. Near-black carries the words;
lime carries fills, rules and chips. On the dark theme it clears 14.9:1 and may
be used as text there.

## What the tests enforce

`test/design.test.js` fails the build on: a font-size off the scale, more than
ten type steps, spacing bypassing the scale, a hand-set radius, more than a
dozen accent uses, a hex literal outside the token blocks, and inline `px` in
any generated page.

`test/pages.test.js` additionally fails on: a claim of customers or
testimonials that do not exist, a claim that customer data is not stored (it
is), a SOC 2 claim (there has been no audit), and any page that has been edited
by hand instead of through `_build.py`.

## Adding something new

Use the existing tokens. If a value you need genuinely is not there, change the
scale rather than adding an exception — an exception is how eighteen font sizes
happened. And before adding a bordered box, check whether the section next to it
already has one; four different card styles on one page is what "cluttered"
usually means.
