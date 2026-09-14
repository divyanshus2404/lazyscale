# Brand assets

## Regenerating the link preview

`og-image.html` is the source for `/og-image.png` — the card people see when the
site is pasted into WhatsApp, LinkedIn, Slack or a DM. It is built from the same
tokens as the site, so it stays honest as long as it is regenerated rather than
edited by hand.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1200,630 --virtual-time-budget=6000 \
  --screenshot=og-image.png brand/og-image.html
```

Rendered at 2× for 2400×1260, which keeps the 1.91:1 ratio every platform wants
and stays sharp on a retina screen.

**Regenerate it whenever the headline, the palette or the logo changes.** The
previous version sat unchanged through a full rebrand, so for weeks every link
shared showed a company that no longer existed.

## The README banner

`make-banner.py` writes `repo-banner-light.svg` and `repo-banner-dark.svg` — the
animated header of the GitHub README. Both come out of one source, so the themes
cannot drift apart.

```bash
python3 brand/make-banner.py
```

Animated SVG is the only motion a README can have: Markdown strips `<style>` and
`<script>`, but an SVG loaded as an image keeps its own internal CSS. No
JavaScript, no GIF, no external request — and about 5 KB per theme, where a GIF
of the same loop would be roughly forty times that and blurrier.

**Nothing in it animates its own visibility.** The first version faded the
headline and logo in from `opacity: 0`, so for the opening second of every loop
the banner was an empty rectangle — and a paused frame, a preview thumbnail, or
a renderer that ignores CSS could catch it exactly there. Motion now lives in
decoration: the rule sweeps, the bubbles nudge, the typing dots blink. Every
word is legible in every frame.

The font stack is a presentation attribute on the root rather than a CSS class,
for the same reason: dropped styles should cost the animation, not the typeface.
It rendered in Times once before that moved.

The same script writes `pipeline-light.svg` / `pipeline-dark.svg`, the strip
under "The endpoints" — one lime pulse travelling from the enquiry to the alert,
with the recording step highlighted because that is the claim the section makes.

Two more come out of the same script: `terminal-*.svg` types the quickstart
into a window above the commands it duplicates, and `forwarded-*.svg` draws the
envelope trap under the section that explains it — a reply looping back to the
business, then reaching the customer instead.

The terminal types by sliding background-coloured covers off each line. Their
resting position is *clear* of the text and is set as a transform attribute, not
only in CSS, so a stylesheet that never loads costs the animation and not the
commands. The first version had it backwards and hid every line it was meant to
show; the covers were also unclipped and slid out across the page.

Every file is parsed before it is written. A bare `&` in a label once produced
two SVGs that browsers refused to render, and a broken `<img>` in a README looks
like a missing file rather than a typo.

To check a change, open both files in a browser and let the loop run twice, then
reload with animations off and confirm the still frame is the one you want.

## The files

| File | Use it for |
|---|---|
| `logo-tile.png` | 512×512. **The mark as it appears on the site** — outlined tile, off-white ground, room around it so nothing clips. Use this where the crop is square and you want it to match the site: LinkedIn, Google Business, a slide. |
| `logo-square.png` | 512×512. Lime edge to edge, no outline. Use this where the platform crops to a **circle** — WhatsApp Business, Instagram — because a rounded tile inside a circular crop leaves four odd corners of background. |
| `logo-wordmark.png` | 2400×800. Cover images, email signatures, a slide. |
| `logo.svg` | The mark as vector. Anywhere it needs to scale, or be recoloured. |

Regenerate either PNG from its HTML with the same headless command as the card:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --window-size=512,512 --virtual-time-budget=4000 \
  --screenshot=brand/logo-square.png brand/logo-square.html
```

The wordmark renders at `--force-device-scale-factor=2` with `--window-size=1200,400`.

## The mark

The LS monogram lives inline in each page rather than as a file, so it inherits
`currentColor` and flips with the theme. The tile is always lime; the border is
`currentColor`. There is a literal-colour copy in each page's favicon data URI,
because CSS variables do not resolve inside a `data:` URL.
