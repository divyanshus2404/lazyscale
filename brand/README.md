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

## The mark

The LS monogram lives inline in each page rather than as a file, so it inherits
`currentColor` and flips with the theme. The tile is always lime; the border is
`currentColor`. There is a literal-colour copy in each page's favicon data URI,
because CSS variables do not resolve inside a `data:` URL.
