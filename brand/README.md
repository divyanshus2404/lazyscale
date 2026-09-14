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

`repo-banner.html` is the source for the two PNGs at the top of the GitHub
README. It is built from the site's own tokens, so the repo page and the site
stay the same company.

GitHub picks the variant from the reader's theme, via `<picture>` and
`prefers-color-scheme` — which is why there are two files rather than one.

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1200,400 --virtual-time-budget=8000 \
  --screenshot=brand/repo-banner-light.png "file://$(pwd)/brand/repo-banner.html"

"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1200,400 --virtual-time-budget=8000 \
  --screenshot=brand/repo-banner-dark.png "file://$(pwd)/brand/repo-banner.html?theme=dark"
```

**The `file://` prefix is not optional for the dark variant.** Given a relative
path with a query string, Chrome reads `brand` as a hostname, fails DNS, and
screenshots its own error page — at the right size, in the right dark grey, so
it looks plausible in a file listing. Open both PNGs after rendering.

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
