# Running it on your laptop

The whole product — site and serverless functions — on one command, with no
accounts and no keys.

```bash
./run-local.sh
```

Then open <http://localhost:3100>.

The first run asks Vercel CLI to resolve the linked project; after that it is
instant. Stop it with Ctrl-C.

---

## What works with nothing configured

**Everything except the model.** The drop-in captures enquiries, records them,
and `/api/stats` returns the numbers. You can watch the full path end to end
before spending a rupee.

Try it:

```bash
# a customer submits an enquiry
curl -X POST 'http://localhost:3100/api/inbound?k=demo' \
  -H 'content-type: application/json' \
  -d '{"name":"Priya","email":"priya@example.in","message":"3BHK in Whitefield, budget 1.2 Cr"}'

# what the review would say
curl 'http://localhost:3100/api/stats?k=demo&s=local-dev-secret' | python3 -m json.tool
```

Enquiries land in `.local-enquiries.jsonl`, one JSON object per line. Open it in
any editor. It is gitignored.

**That file only exists locally.** `_store.js` checks `process.env.VERCEL`, which
Vercel sets on every deployment, so this path cannot be reached in production
even by accident. Deployed, it is Supabase or nothing.

`alertsFailed` will equal the number of enquiries until `RESEND_API_KEY` is set.
That is correct, not a bug — no email provider, no alerts, and it says so rather
than pretending.

## Turning the real pieces on

Edit `.env.local` and restart. It is gitignored; never commit it.

| Add | And you get |
|---|---|
| `RESEND_API_KEY`, `OWNER_EMAIL` | Alerts actually send |
| `ANTHROPIC_API_KEY` | Scoring, drafted replies, the audit, the interview |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Rows go to the real table instead of the local file |

**Set a monthly spend cap on the Anthropic key before using it locally.** A loop
in a dev server is a fast way to spend money.

## Two things that cost time here

**`vercel dev` does not reliably read `.env.local` on a linked project.** It
resolves environment from the linked Vercel project, so variables that exist only
in the local file never reach the functions — the endpoint just answers "Unknown
endpoint key" as though the config were wrong. `run-local.sh` sources the file
and exports it, which does work.

**A JSON value in an env file has to be quoted.** `TENANTS_JSON={"demo":...}`
unquoted does not survive parsing. Single quotes around the whole value:

```
TENANTS_JSON='{"demo":{"name":"Demo Business","email":"you@example.com"}}'
```

## Ports

`PORT=4000 ./run-local.sh` if 3100 is taken. The plain static site alone, with no
functions, is still `python3 -m http.server 8899`.
