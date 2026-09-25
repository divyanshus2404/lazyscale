#!/usr/bin/env python3
"""
The morning post: one branded image and one caption.

    python3 content/make-post.py            # today's, into out/
    python3 content/make-post.py --peek 5   # the next five, without recording them

Rotation is deterministic and recorded in content/.posted.json, so nothing
repeats until the pool is exhausted, and a missed morning does not skip an item.

The image is rendered from HTML through headless Chrome, the same way every
other asset in brand/ is made. Nothing is drawn by hand and nothing is invented:
the text comes from the catalogue the site publishes.
"""
import argparse
import datetime as dt
import io
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from source import pool  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STATE = os.path.join(HERE, ".posted.json")
OUT = os.path.join(ROOT, "out")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

LIME = "#B7F34A"
THEME = dict(bg="#F7F7F5", card="#FFFFFF", text="#111111",
             muted="#5A5A57", border="#E7E7E4")

# 1080x1350 — LinkedIn shows portrait images larger in the feed than square,
# and much larger than landscape.
CARD = """<!doctype html><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
  html, body {{ margin: 0; width: 1080px; height: 1350px; }}
  body {{
    background: {bg}; color: {text};
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex; flex-direction: column;
    padding: 84px; box-sizing: border-box; position: relative; overflow: hidden;
  }}
  .glow {{
    position: absolute; top: -260px; right: -220px; width: 760px; height: 760px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(183,243,74,0.26) 0%, rgba(183,243,74,0) 70%);
  }}
  .top {{ display: flex; align-items: center; gap: 20px; }}
  .top svg {{ width: 64px; height: 64px; display: block; }}
  .top b {{ font-size: 40px; font-weight: 700; letter-spacing: -0.03em; }}
  .eyebrow {{
    margin-top: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: {muted};
  }}
  .eyebrow i {{
    font-style: normal; display: inline-block; width: 12px; height: 12px;
    border-radius: 50%; background: {lime}; margin-right: 14px; vertical-align: 1px;
  }}
  h1 {{
    margin: 28px 0 0; font-size: {size}px; line-height: 1.08;
    font-weight: 700; letter-spacing: -0.035em;
  }}
  .rule {{ width: 160px; height: 8px; border-radius: 4px; background: {lime}; margin: 44px 0 0; }}
  p {{ margin: 40px 0 0; font-size: 34px; line-height: 1.45; color: {muted}; max-width: 880px; }}
  .sp {{ flex: 1 1 auto; }}
  .foot {{
    display: flex; align-items: center; justify-content: space-between;
    border-top: 2px solid {border}; padding-top: 32px; font-size: 26px; color: {muted};
  }}
  .foot b {{ color: {text}; font-weight: 600; }}
</style>
<div class="glow"></div>
<div class="top">
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="2.5" width="43" height="43" rx="13" fill="{lime}" stroke="#111111" stroke-width="2.6"/><g transform="translate(-1.6,0)" fill="none" stroke="#111111" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 13.2 V29.6 a4.6 4.6 0 0 0 4.6 4.6 h1.2"/><path d="M35.4 19.4 C35.4 16 32.9 13.9 29.9 13.9 C26.9 13.9 24.6 15.8 24.6 18.3 C24.6 23.9 35.8 22.2 35.8 28.6 C35.8 31.9 33.1 34.4 29.9 34.4 C26.7 34.4 24.2 32.4 24.2 29.3"/></g></svg>
  <b>LazyScale</b>
</div>
<div class="sp"></div>
<div class="eyebrow"><i></i>{eyebrow}</div>
<h1>{title}</h1>
<div class="rule"></div>
<p>{body}</p>
<div class="sp"></div>
<div class="foot"><span><b>lazyscale.vercel.app</b></span><span>{stamp}</span></div>
"""

EYEBROW = {
    "automation": "What we automate",
    "refuse": "What we refuse to build",
    "principle": "How we decide",
}


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def caption(item):
    """The words under the picture.

    Deliberately plain. No emoji ladders, no "🚀 Excited to share", no claimed
    numbers — the business has no results yet and a caption that invents them is
    the fastest way to be caught out by the one person who asks.
    """
    link = "lazyscale.vercel.app/automations"
    if item["kind"] == "refuse":
        opener = "Something we won't build, and why."
        closing = ("We publish the full list of what we refuse, next to what we do. "
                   "It is shorter to read than a sales call.")
    elif item["kind"] == "principle":
        opener = "How we decide whether something is worth automating."
        closing = ("Two failures against our four questions and we tell you not to build it. "
                   "Some of the best calls we have end that way.")
    else:
        opener = f"{item['category']}, automated."
        closing = ("This is one of 55 we publish openly — along with the seven we refuse "
                   "to build at any price.")

    return "\n".join([
        opener,
        "",
        item["title"] + ".",
        item["body"],
        "",
        closing,
        "",
        link,
    ])


def load_state():
    try:
        return json.load(io.open(STATE, encoding="utf-8"))
    except Exception:
        return {"used": [], "history": []}


def next_item(state, offset=0):
    items = pool()
    used = set(state.get("used", []))
    queue = [i for i in items if key(i) not in used]
    if not queue:                      # pool exhausted — start again
        queue = items
    return queue[offset % len(queue)]


def key(item):
    return f"{item['kind']}:{item['title']}"


def render(item, stamp, path):
    title = item["title"]
    # One size does not fit a four-word title and a twelve-word one.
    size = 92 if len(title) <= 26 else 78 if len(title) <= 42 else 64
    html = CARD.format(
        lime=LIME, size=size, stamp=stamp,
        eyebrow=EYEBROW[item["kind"]],
        title=esc(title), body=esc(item["body"]),
        **THEME
    )
    tmp = path + ".html"
    io.open(tmp, "w", encoding="utf-8").write(html)
    if not os.path.exists(CHROME):
        raise SystemExit("Google Chrome not found — it renders the image")
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--window-size=1080,1350", "--virtual-time-budget=8000",
        "--screenshot=" + path, "file://" + os.path.abspath(tmp),
    ], check=True, capture_output=True)
    os.remove(tmp)
    if not os.path.exists(path) or os.path.getsize(path) < 10000:
        raise SystemExit("the render produced nothing usable — check Chrome")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--peek", type=int, default=0, help="show the next N without recording them")
    ap.add_argument("--date", default=None, help="YYYY-MM-DD, for catching up a missed day")
    args = ap.parse_args()

    state = load_state()

    if args.peek:
        for n in range(args.peek):
            item = next_item(state, n)
            print(f"{n+1}. [{item['kind']}] {item['title']} — {item['body'][:60]}…")
        return

    day = args.date or dt.date.today().isoformat()
    os.makedirs(OUT, exist_ok=True)
    item = next_item(state)

    img = os.path.join(OUT, f"{day}.png")
    txt = os.path.join(OUT, f"{day}.txt")
    render(item, dt.date.fromisoformat(day).strftime("%d %b %Y"), img)
    io.open(txt, "w", encoding="utf-8").write(caption(item) + "\n")

    state.setdefault("used", []).append(key(item))
    state.setdefault("history", []).append({"date": day, "item": key(item)})
    io.open(STATE, "w", encoding="utf-8").write(json.dumps(state, indent=1) + "\n")

    print(img)
    print(txt)
    print(f"[{item['kind']}] {item['title']}")


if __name__ == "__main__":
    main()
