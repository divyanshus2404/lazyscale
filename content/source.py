#!/usr/bin/env python3
"""
Where the daily post comes from.

Everything here is drawn from the catalogue the site already publishes, so a
post can never claim something the business does not do. There is no generated
prose about results, because there are no results yet — the day that changes,
add them here and they will start appearing.
"""
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def catalogue():
    """The 55 automations, straight out of automations.html.

    Parsed rather than copied: a second copy of this list would drift from the
    page within a month, and the post would start advertising something the
    site no longer offers.
    """
    html = io.open(os.path.join(ROOT, "automations.html"), encoding="utf-8").read()
    start = html.find("const ITEMS = [")
    if start == -1:
        raise SystemExit("automations.html no longer contains ITEMS — check the page before posting")
    block = html[start:html.find("];", start)]
    rows = re.findall(r'\["([^"]*)","([^"]*)","([^"]*)","([^"]*)"\]', block)
    if not rows:
        raise SystemExit("ITEMS found but nothing parsed — the format changed")
    out = []
    for cat, tier, title, body in rows:
        out.append({
            "kind": "refuse" if tier == "no" else "automation",
            "category": unescape(cat),
            "tier": tier,
            "title": unescape(title),
            "body": unescape(body),
        })
    return out


def unescape(s):
    return (s.replace("&#8212;", "—").replace("&#8217;", "’").replace("&#8594;", "→")
             .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
             .replace("&#8211;", "–").replace("&quot;", '"'))


# A handful of posts that are about how the work is judged rather than what it
# does. These are the ones worth saying out loud more than once.
PRINCIPLES = [
    {
        "kind": "principle",
        "category": "How we decide",
        "title": "Does it happen weekly or more?",
        "body": "Automating a monthly twenty-minute job saves four hours a year. "
                "That is not worth anyone's build cost, and we will say so.",
    },
    {
        "kind": "principle",
        "category": "How we decide",
        "title": "Can someone approve it before anything irreversible happens?",
        "body": "Nothing that sends money, deletes data or promises a customer "
                "something goes out without a person saying yes first.",
    },
    {
        "kind": "principle",
        "category": "When we say no",
        "title": "The real problem is upstream",
        "body": "If the leads are bad, automating follow-up just processes junk "
                "faster. Fixing where they come from is the cheaper project.",
    },
    {
        "kind": "principle",
        "category": "When we say no",
        "title": "The process is still changing",
        "body": "You would be paying us to rebuild it every month. Wait until it "
                "settles — the automation will be cheaper and it will last.",
    },
    {
        "kind": "principle",
        "category": "When we say no",
        "title": "One person does it, and likes it",
        "body": "Automation that removes the interesting part of someone's job "
                "gets quietly worked around. We have seen it happen.",
    },
    {
        "kind": "principle",
        "category": "How we decide",
        "title": "Can you name what it costs you?",
        "body": "In hours or in rupees. If nobody can put a number on it, nobody "
                "will value the automation by month three.",
    },
]


def pool():
    """Everything postable, in a stable order so the rotation is repeatable."""
    items = catalogue() + PRINCIPLES
    return items


if __name__ == "__main__":
    items = pool()
    kinds = {}
    for i in items:
        kinds[i["kind"]] = kinds.get(i["kind"], 0) + 1
    print(f"{len(items)} postable items: {kinds}")
    print(f"at one a day, that is {len(items) // 7} weeks before anything repeats")
