# The morning post

One branded image and one caption, generated every morning from material the
site already publishes.

```bash
./content/morning.sh              # today's post; caption goes to the clipboard
python3 content/make-post.py --peek 5    # what is coming, without using it up
```

Output lands in `out/` as `YYYY-MM-DD.png` (1080×1350, the size LinkedIn shows
largest in the feed) and `YYYY-MM-DD.txt`.

## Where the words come from

`content/source.py` parses the 55 automations out of `automations.html` rather
than keeping a second copy, so a post can never advertise something the site no
longer offers. Alongside them are the seven refusals and six posts about how the
work is judged — 61 items, about eight weeks before anything repeats.

Captions are deliberately plain: no emoji ladders, no "excited to share", and no
numbers. **There are no results yet, and a caption that invents them is the
fastest way to be caught out by the one person who asks.** When there are real
results, put them in `source.py` and they will start appearing.

`content/.posted.json` records what has gone out, so a missed morning delays the
rotation rather than skipping an item.

## Scheduling it

```bash
./mac/install-daily.sh            # every day at 08:00
HOUR=7 ./mac/install-daily.sh     # earlier
./mac/install-daily.sh --remove
```

launchd rather than cron, because launchd runs a missed job when the Mac wakes
instead of dropping the day.

**This does not work while the project lives in `~/Downloads`.** macOS gates
access to Downloads, Documents and Desktop, and a launchd agent is refused
rather than prompted — the log shows `Operation not permitted` and nothing is
generated. Move the project somewhere like `~/Projects/lazyscale` and reinstall;
that also fixes the same block on the app bundle in `mac/`. Running
`./content/morning.sh` by hand from Terminal works either way, because Terminal
already has the permission.

## Why it stops at the clipboard

Posting to a LinkedIn **company page** needs the Community Management API, which
is partner-approved rather than self-serve. Driving linkedin.com with a script
instead would breach their User Agreement, so it is not built here.

So the last step is manual, and takes about five seconds: the image is in `out/`,
the caption is already on the clipboard.

If Community Management API access is ever granted, the publishing step belongs
in `morning.sh` after the render — and it should still be opt-in per post rather
than firing unattended. A queue you approve is worth more than an account that
posts on its own; the first bad caption goes out under the company's name either
way.
