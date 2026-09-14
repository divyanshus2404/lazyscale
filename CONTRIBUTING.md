# Working on LazyScale

Everything you need to make a change, in one page.

---

## Running it

There is no build step and no dependencies. Clone it and serve the folder:

```bash
git clone https://github.com/divyanshus2404/lazyscale.git
cd lazyscale
python3 -m http.server 8899
```

Then open <http://localhost:8899>. Edit a file, refresh, done.

The serverless functions in `api/` do not run this way. They need `vercel dev`,
or a preview deployment. Every page works without them — forms fall back to
Formspree and the AI features show a plain message rather than breaking.

## How to make a change

```bash
git checkout -b whatever-you-are-doing
# edit, test, commit
git push -u origin whatever-you-are-doing
```

Then open a pull request. **Do not push to `main`.** Vercel deploys `main`
automatically, so a push to it is a deploy to the live site.

---

## Five rules that matter here

These are not style preferences. Each one is a bug that has already happened.

### 1. Content must never depend on an animation

If an element starts at `opacity: 0` and only becomes visible when JavaScript
adds a class, then a backgrounded tab, a failed observer or a stalled frame
leaves it invisible forever. This has happened four times.

Hidden state is scoped to a class that JS adds, animation is decoration on top,
and there is a failsafe that reveals everything after 2.5 seconds if the
observer never reports. Test every visual change with motion switched off:

```js
document.head.insertAdjacentHTML('beforeend',
  '<style>*,*::before,*::after{transition:none!important;animation:none!important}</style>');
```

If anything disappears, it is broken.

### 2. Check contrast, in both themes

Lime `#B7F34A` is **1.23:1** on the page background. It is a fill colour — a
button, a tick, a rule — and never text in light mode. On the dark background it
clears AA at 14.9:1 and becomes text.

Paste `check.js` into the browser console after any visual change. It reports
contrast failures, heading-order jumps, overflow and stray markup. Zero is the
only acceptable number.

### 3. Never claim a result we have not measured

There are no clients yet. Nothing on the site may state a saving, a response
time or an outcome as fact. The picker computes its estimate from a number the
visitor sets and says so. `/response-times` refuses to render figures until real
data is pasted in.

A page of plausible statistics nobody measured is the one thing that would
genuinely damage this business.

### 4. Tokens, not values

Colour, spacing, radius and type are custom properties on `:root`. Use
`var(--text-secondary)`, never `#4A4A48`. That is why the whole site changed
look in one pass — and why a hardcoded colour breaks dark mode silently.

### 5. Never commit a key

Everything sensitive lives in Vercel environment variables. `sk-ant-...` in the
docs is a placeholder and must stay one. If you ever paste a real key into a
file, tell Divyanshu immediately — it has to be rotated, not just deleted,
because it stays in git history.

---

## Before you open a PR

- [ ] Tested at 390px and desktop
- [ ] Tested in light and dark
- [ ] Ran `check.js` — zero failures
- [ ] Tested with animation disabled (rule 1)
- [ ] No hardcoded colours
- [ ] No real keys

## What is where

See the repo map in [`README.md`](README.md). The short version: `index.html` is
the whole site, `api/` holds the endpoints, `services/` holds the operating
documents that decide what gets built and what gets refused.

**Read [`services/README.md`](services/README.md) before changing anything that
makes a promise to a client.** The refusals in it are not decoration.
