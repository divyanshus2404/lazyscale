#!/usr/bin/env python3
"""
Renders brand/repo-banner-light.svg and brand/repo-banner-dark.svg — the
animated header of the GitHub README.

Animated SVG is the only motion GitHub allows in a README: Markdown strips
<style> and <script>, but an SVG loaded as an image keeps its own internal CSS,
so the animation lives inside the file. No JavaScript, no GIF, no external
requests — a GIF of this would be about 40x the size and half the sharpness.

    python3 brand/make-banner.py

Both files are written from the same source, so the two themes cannot drift.

No element animates its own visibility. The first version faded the headline
and the logo in from opacity 0, which meant that for the opening second of every
seven-second loop the banner was an empty rectangle — and a paused or sampled
frame could catch it there. Motion is carried by decoration: a rule that sweeps,
bubbles that nudge, typing dots that blink. Every word is legible in every
frame, including the frame a renderer that ignores CSS entirely will show.

For the same reason the font stack is a presentation attribute on the root
rather than a CSS class: dropped styles should cost the animation, not the
typeface.
"""
import io
import os
import xml.dom.minidom

THEMES = {
    "light": dict(bg="#F7F7F5", text="#111111", muted="#5A5A57", border="#E7E7E4",
                  card="#FFFFFF", bubble="#EFEFEC", glow="0.20", markstroke="#111111",
                  warn="#B4531A", lime2="#4F7A12", term="#FFFFFF"),
    "dark":  dict(bg="#0B0B0C", text="#E8E8E6", muted="#8A8A88", border="#26262A",
                  card="#121213", bubble="#1A1A1C", glow="0.10", markstroke="#111111",
                  warn="#F0B27A", lime2="#B7F34A", term="#121213"),
}
LIME = "#B7F34A"

# One 7s loop: enquiry lands, dots, reply goes out, the number appears, hold, reset.
TEMPLATE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400" font-family="Inter, -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Helvetica, Arial, sans-serif" role="img" aria-label="LazyScale — stop doing work a machine can do. Every enquiry answered in under a minute.">
<title>LazyScale — every enquiry answered in under a minute</title>
<defs>
  <radialGradient id="g" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="{lime}" stop-opacity="{glow}"/>
    <stop offset="70%" stop-color="{lime}" stop-opacity="0"/>
  </radialGradient>
</defs>

<style>
  /* Nothing here animates a word out of existence. Every element is readable at
     every frame of the loop; the motion is carried by decoration only. An
     animated SVG in a README can be paused, sampled for a preview, or rendered
     by something that does not animate at all, and all three must look right. */

  .rule {{ animation: sweep 7s cubic-bezier(.2,.7,.3,1) infinite; transform-origin: 84px 278px; }}
  @keyframes sweep {{ 0% {{ transform: scaleX(.16) }} 26%,100% {{ transform: scaleX(1) }} }}

  /* the reply lands — a nudge, not an entrance */
  .out {{ animation: land 7s cubic-bezier(.2,.8,.3,1) infinite; transform-origin: 945px 245px; }}
  @keyframes land {{ 0%,46% {{ transform: translateX(0) scale(1) }} 54% {{ transform: translateX(0) scale(1.035) }} 62%,100% {{ transform: translateX(0) scale(1) }} }}

  .inb {{ animation: arrive 7s cubic-bezier(.2,.8,.3,1) infinite; transform-origin: 915px 129px; }}
  @keyframes arrive {{ 0% {{ transform: scale(1) }} 6% {{ transform: scale(1.03) }} 14%,100% {{ transform: scale(1) }} }}

  /* the only thing that may vanish, because it says nothing */
  .dot {{ opacity: .25; animation: blink 7s ease-in-out infinite; }}
  @keyframes blink {{ 0%,20% {{ opacity: .25 }} 26% {{ opacity: 1 }} 40% {{ opacity: .25 }} 100% {{ opacity: .25 }} }}
  .d2 {{ animation-delay: .16s }} .d3 {{ animation-delay: .32s }}

  .stamp {{ animation: tick 7s ease-out infinite; transform-origin: 898px 314px; }}
  @keyframes tick {{ 0%,62% {{ transform: scale(1) }} 70% {{ transform: scale(1.05) }} 80%,100% {{ transform: scale(1) }} }}

  .glow {{ animation: drift 14s ease-in-out infinite; transform-origin: 1010px 40px; }}
  @keyframes drift {{ 0%,100% {{ transform: scale(1) }} 50% {{ transform: scale(1.12) }} }}

  @media (prefers-reduced-motion: reduce) {{
    .rule, .out, .inb, .stamp, .glow {{ animation: none; transform: none }}
    .dot {{ animation: none; opacity: .25 }}
  }}
</style>

<rect width="1200" height="400" fill="{bg}"/>
<circle class="glow" cx="1010" cy="40" r="300" fill="url(#g)"/>

<!-- mark + name -->
<g>
  <g transform="translate(84,44) scale(1.0833)">
    <rect x="2.5" y="2.5" width="43" height="43" rx="13" fill="{lime}" stroke="{markstroke}" stroke-width="2.6"/>
    <g transform="translate(-1.6,0)" fill="none" stroke="{markstroke}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 13.2 V29.6 a4.6 4.6 0 0 0 4.6 4.6 h1.2"/>
      <path d="M35.4 19.4 C35.4 16 32.9 13.9 29.9 13.9 C26.9 13.9 24.6 15.8 24.6 18.3 C24.6 23.9 35.8 22.2 35.8 28.6 C35.8 31.9 33.1 34.4 29.9 34.4 C26.7 34.4 24.2 32.4 24.2 29.3"/>
    </g>
  </g>
  <text class="f" x="152" y="80" font-size="30" font-weight="700" letter-spacing="-0.8" fill="{text}">LazyScale</text>
</g>

<!-- headline, wiped in line by line -->
<g><text class="f" x="84" y="200" font-size="52" font-weight="700" letter-spacing="-1.8" fill="{text}">Stop doing work</text></g>
<g><text class="f" x="84" y="262" font-size="52" font-weight="700" letter-spacing="-1.8" fill="{text}">a machine can do.</text></g>
<rect class="rule" x="84" y="276" width="500" height="5" rx="2.5" fill="{lime}"/>

<text class="f" x="84" y="320" font-size="18" fill="{muted}">Every enquiry answered in under a minute — WhatsApp, Instagram, email and the web.</text>

<g class="f" font-size="13" fill="{muted}">
  <g><rect x="84" y="344" width="196" height="30" rx="15" fill="none" stroke="{border}"/><text x="102" y="364">Static HTML, no build step</text></g>
  <g><rect x="290" y="344" width="158" height="30" rx="15" fill="none" stroke="{border}"/><text x="308" y="364">Serverless on Vercel</text></g>
  <g><rect x="458" y="344" width="160" height="30" rx="15" fill="none" stroke="{border}"/><text x="476" y="364">Capture before spend</text></g>
</g>

<!-- the scene -->
<g class="f" font-size="14">
  <g class="inb">
    <rect x="770" y="96" width="290" height="66" rx="16" fill="{bubble}"/>
    <text x="792" y="124" fill="{text}" font-size="14">Do you deliver to Indiranagar?</text>
    <text x="792" y="146" fill="{muted}" font-size="13">11:41 pm</text>
  </g>

  <g fill="{muted}">
    <circle class="dot" cx="794" cy="190" r="5"/>
    <circle class="dot d2" cx="812" cy="190" r="5"/>
    <circle class="dot d3" cx="830" cy="190" r="5"/>
  </g>

  <g class="out">
    <rect x="800" y="212" width="290" height="66" rx="16" fill="{lime}"/>
    <text x="822" y="240" fill="#111111" font-size="14">Yes — same day to Indiranagar.</text>
    <text x="822" y="262" fill="#111111" font-size="13" opacity="0.72">11:41 pm</text>
  </g>

  <g class="stamp">
    <rect x="800" y="296" width="196" height="36" rx="18" fill="none" stroke="{lime}" stroke-width="2"/>
    <path d="M822 314 l7 7 l13 -14" fill="none" stroke="{lime}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="852" y="319" fill="{text}" font-size="14" font-weight="500">answered in 41s</text>
  </g>
</g>
</svg>
'''


# ── the pipeline strip, under "The endpoints" ────────────────────────────────
PIPE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 150" width="1200" height="150" font-family="Inter, -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Helvetica, Arial, sans-serif" role="img" aria-label="An enquiry arrives from a form, WhatsApp, Instagram or email; it is recorded; then scored and drafted; then the owner is alerted. Recording happens before the model is called.">
<title>What happens to an enquiry</title>
<style>
  /* The pulse is the only moving part, and it carries no information that is
     not also written underneath it. */
  .pulse {{ animation: run 5s cubic-bezier(.4,0,.2,1) infinite; }}
  @keyframes run {{
    0% {{ transform: translateX(0); opacity: 0 }}
    6% {{ opacity: 1 }}
    92% {{ opacity: 1 }}
    100% {{ transform: translateX(816px); opacity: 0 }}
  }}
  @media (prefers-reduced-motion: reduce) {{ .pulse {{ animation: none; opacity: 0 }} }}
</style>
<rect width="1200" height="150" fill="{bg}"/>
<line x1="196" y1="62" x2="1012" y2="62" stroke="{border}" stroke-width="2"/>
<circle class="pulse" cx="196" cy="62" r="5" fill="{lime}"/>
{stages}
</svg>
'''

STAGES = [
    (84,  "Enquiry arrives", "form · WhatsApp · Instagram · email"),
    (356, "Recorded",        "on disk before anything else"),
    (628, "Scored and drafted", "only if a key is configured"),
    (900, "Owner alerted",   "with the reply ready to send"),
]

def pipeline_svg(t):
    out = []
    for i, (x, title, sub) in enumerate(STAGES):
        fill = LIME if i == 1 else t["card"]
        stroke = LIME if i == 1 else t["border"]
        out.append(
            '<g><rect x="%d" y="44" width="224" height="36" rx="18" fill="%s" stroke="%s" stroke-width="2"/>'
            '<text x="%d" y="67" font-size="14" font-weight="500" fill="%s" text-anchor="middle">%s</text>'
            '<text x="%d" y="104" font-size="12.5" fill="%s" text-anchor="middle">%s</text></g>'
            % (x, fill, stroke, x + 112, "#111111" if i == 1 else t["text"], title,
               x + 112, t["muted"], sub)
        )
    return PIPE.format(bg=t["bg"], border=t["border"], lime=LIME, stages="\n".join(out))


# ── the terminal, above the quickstart ───────────────────────────────────────
# The typing effect is done with cover rectangles painted in the background
# colour that slide away to the right, never by revealing hidden text. With the
# animation off the covers sit clear of the text and the whole session is
# readable — which is the same rule the banner follows.
TERM = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 290" width="1200" height="290" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" role="img" aria-label="A terminal session: run-local.sh starts the server on port 3100, a curl posts an enquiry, and the response is ok true, replied false, recorded true.">
<title>Clone it, run it, send it an enquiry</title>
<defs><clipPath id="win"><rect x="86" y="72" width="1028" height="200"/></clipPath></defs>
<style>
  /* Each line is typed by sliding a background-coloured cover off it.
     The cover's RESTING position is clear of the text — the animation is what
     puts it back over the line — so a renderer that ignores this stylesheet
     shows the whole session rather than three blank rows. The resting position
     is a transform ATTRIBUTE, not just this rule, so it survives a stylesheet
     that never loads at all. Getting that
     backwards is what made the first version of this file useless.
     Covers are clipped to the window; the first version slid them straight
     out across the page. */
  .cover {{ transform: translateX(1000px); animation: type 9s cubic-bezier(.85,0,.9,1) infinite; }}
  @keyframes type {{ 0% {{ transform: translateX(0) }} 22%,100% {{ transform: translateX(1000px) }} }}
  .l2 {{ animation-delay: .9s }}
  .l3 {{ animation-delay: 1.15s }}
  .caret {{ animation: blink 1.06s steps(2, start) infinite; }}
  @keyframes blink {{ 0%,50% {{ opacity: 1 }} 50.01%,100% {{ opacity: 0 }} }}
  @media (prefers-reduced-motion: reduce) {{
    .cover {{ animation: none; transform: translateX(1000px) }}
    .caret {{ animation: none }}
  }}
</style>
<rect width="1200" height="290" fill="{bg}"/>
<rect x="84" y="16" width="1032" height="258" rx="14" fill="{term}" stroke="{border}" stroke-width="2"/>
<circle cx="112" cy="46" r="6" fill="{dots}"/><circle cx="132" cy="46" r="6" fill="{dots}"/><circle cx="152" cy="46" r="6" fill="{dots}"/>
<text x="176" y="51" font-size="13" fill="{muted}">bash — lazyscale</text>
<line x1="84" y1="70" x2="1116" y2="70" stroke="{border}" stroke-width="2"/>

<g font-size="14.5" clip-path="url(#win)">
  <text x="112" y="104" fill="{lime}">$</text>
  <text x="132" y="104" fill="{termfg}">./run-local.sh</text>
  <rect class="cover l1" transform="translate(1000 0)" x="129" y="88" width="990" height="22" fill="{term}"/>

  <text x="112" y="132" fill="{muted}">→ http://localhost:3100</text>

  <text x="112" y="176" fill="{lime}">$</text>
  <text x="132" y="176" fill="{termfg}">curl -X POST "localhost:3100/api/inbound?k=demo"</text>
  <text x="152" y="200" fill="{termfg}">-d '{{"name":"Priya","message":"30 chairs by Friday?"}}'</text>
  <rect class="cover l2" transform="translate(1000 0)" x="129" y="160" width="990" height="22" fill="{term}"/>
  <rect class="cover l3" transform="translate(1000 0)" x="129" y="184" width="990" height="22" fill="{term}"/>

  <text x="112" y="240" fill="{muted}">{{"ok":true,"replied":false,"recorded":<tspan fill="{lime}" font-weight="700">true</tspan>}}</text>
  <rect class="caret" x="112" y="256" width="9" height="16" fill="{termfg}" opacity="0.75"/>
</g>
</svg>
'''

# ── the forwarded-email trap ─────────────────────────────────────────────────
FWD = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 250" width="1200" height="250" font-family="Inter, -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Helvetica, Arial, sans-serif" role="img" aria-label="Trusting the envelope sends the reply back to the business that forwarded it. Reading the forward header sends it to the customer who actually asked.">
<title>Who gets the reply</title>
<style>
  .b {{ animation: bad 6s cubic-bezier(.4,0,.2,1) infinite; }}
  @keyframes bad {{ 0% {{ transform: translateX(0) }} 45%,100% {{ transform: translateX(300px) }} }}
  .g {{ animation: good 6s cubic-bezier(.4,0,.2,1) infinite; }}
  @keyframes good {{ 0%,50% {{ transform: translateX(0) }} 95%,100% {{ transform: translateX(632px) }} }}
  @media (prefers-reduced-motion: reduce) {{ .b, .g {{ animation: none; opacity: 0 }} }}
</style>
<rect width="1200" height="250" fill="{bg}"/>

<text x="84" y="34" font-size="13" font-weight="600" fill="{warn}">TRUSTING THE ENVELOPE</text>
<g font-size="13.5">
  <rect x="84" y="48" width="180" height="42" rx="12" fill="{card}" stroke="{border}" stroke-width="2"/>
  <text x="174" y="74" fill="{text}" text-anchor="middle">customer</text>
  <rect x="384" y="48" width="180" height="42" rx="12" fill="{card}" stroke="{warn}" stroke-width="2"/>
  <text x="474" y="74" fill="{text}" text-anchor="middle">the business</text>
  <path d="M264 69 H384" stroke="{border}" stroke-width="2"/>
  <path d="M474 96 v18 h-90 v-18" fill="none" stroke="{warn}" stroke-width="2" stroke-dasharray="5 5"/>
  <circle class="b" cx="94" cy="69" r="5" fill="{warn}"/>
  <text x="600" y="74" fill="{muted}">the reply goes back to whoever forwarded it</text>
</g>

<text x="84" y="152" font-size="13" font-weight="600" fill="{lime2}">READING THE FORWARD HEADER</text>
<g font-size="13.5">
  <rect x="84" y="166" width="180" height="42" rx="12" fill="{card}" stroke="{border}" stroke-width="2"/>
  <text x="174" y="192" fill="{text}" text-anchor="middle">customer</text>
  <rect x="384" y="166" width="180" height="42" rx="12" fill="{card}" stroke="{border}" stroke-width="2"/>
  <text x="474" y="192" fill="{text}" text-anchor="middle">the business</text>
  <rect x="684" y="166" width="180" height="42" rx="12" fill="{lime}" stroke="{lime}" stroke-width="2"/>
  <text x="774" y="192" fill="#111111" text-anchor="middle">reply to customer</text>
  <path d="M264 187 H384 M564 187 H684" stroke="{border}" stroke-width="2"/>
  <circle class="g" cx="94" cy="187" r="5" fill="{lime2}"/>
  <text x="900" y="192" fill="{muted}">and null, never a guess, when unreadable</text>
</g>
</svg>
'''


def terminal_svg(t):
    return TERM.format(bg=t["bg"], term=t["card"], termfg=t["text"], muted=t["muted"],
                       border=t["border"], dots=t["border"], lime=LIME)


def forwarded_svg(t):
    return FWD.format(bg=t["bg"], card=t["card"], border=t["border"], text=t["text"],
                      muted=t["muted"], warn=t["warn"], lime=LIME, lime2=t["lime2"])


def write(path, svg):
    """Write an SVG, but only if it parses. A stray "&" in a label once shipped
    two files that browsers refused to render at all — and a broken <img> in a
    README looks like a missing file, not like a typo."""
    xml.dom.minidom.parseString(svg)
    io.open(path, "w", encoding="utf-8").write(svg)
    print("wrote", path, len(svg), "bytes")


here = os.path.dirname(os.path.abspath(__file__))
for name, t in THEMES.items():
    svg = TEMPLATE.format(lime=LIME, **t)
    write(os.path.join(here, "repo-banner-%s.svg" % name), svg)
    write(os.path.join(here, "pipeline-%s.svg" % name), pipeline_svg(t))
    write(os.path.join(here, "terminal-%s.svg" % name), terminal_svg(t))
    write(os.path.join(here, "forwarded-%s.svg" % name), forwarded_svg(t))
