# Recording what happened

Every job description promises a monthly performance review: enquiries handled,
the share handled without a person, escalations and whether the same reason keeps
recurring. None of that can be reconstructed from sent email.

So every enquiry is written down before anything else can lose it.

---

## Why it matters more than it sounds

**The review is a promise.** It is in all four job descriptions, and it is most
of what makes an AI employee feel like a hire rather than a subscription.

**The first case study is these numbers.** Baseline on day one, the same numbers
thirty days later. Without a record there is no case study, and without a case
study the price is unarguable.

**Email is not storage.** Before this, an enquiry existed only as an alert. If
the mail provider had a bad minute the lead was gone and the customer had already
been told it arrived.

---

## Setting it up

Free tier is enough for the first several clients.

### 1. Create the project

[supabase.com](https://supabase.com) → new project. Keep the region close to
your users.

### 2. Create the table

SQL Editor → run this:

```sql
create table if not exists enquiries (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  tenant_key        text not null,
  tenant_name       text,
  name              text,
  email             text,
  phone             text,
  message           text,
  extra             jsonb,
  source            text,
  forwarded_by      text,
  scored            boolean default false,
  score             integer,
  intent            text,
  needs_human       boolean,
  escalation_reason text,
  reply_draft       text,
  alert_sent        boolean default false
);

create index if not exists enquiries_tenant_time
  on enquiries (tenant_key, created_at desc);

-- Row Level Security ON with no policies: the anon key can read nothing.
-- Supabase hands out a public anon key with every project. Leave RLS off and
-- anyone who finds that key can read every client's entire enquiry history.
-- The service role key used by the server bypasses RLS, so this changes nothing
-- about how the app works and everything about what a stranger can reach.
alter table enquiries enable row level security;
```

### 3. Add the keys to Vercel

Settings → Environment Variables:

```
SUPABASE_URL               https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY  <service_role key, from Project Settings → API>
ADMIN_SECRET               openssl rand -hex 24
```

**The service role key bypasses every security rule in the project.** It belongs
in server environment variables and nowhere else — never in a page, never in the
repo, never in a message. If it leaks, rotate it in Supabase immediately.

Redeploy. Environment variables only apply to new deployments.

### 4. Check it

Submit a test enquiry through a client's form. The response now carries
`recorded: true`, and the row appears in the Supabase table editor.

---

## Pulling the review

```
GET /api/stats?k=<tenantKey>&s=<ADMIN_SECRET>&days=30
```

Returns enquiries handled, how many were scored, the median score, escalations,
the share handled without a person, how many alerts failed to send, the top
escalation reasons, and a per-day count.

Those map directly onto the review template in
[`ai-employees/performance-review-template.md`](ai-employees/performance-review-template.md).

**Read the escalation reasons before writing the review.** The same reason
appearing four times is not noise — it is the next thing to fix, and naming it
before the client does is the difference between a review and an invoice.

---

## Order of operations

The enquiry is written down **first**, before the model is called and before any
email is attempted. Both of those are slow and fallible — the model call can take
thirty seconds, the mail provider can have a bad minute — and neither may be a
reason the enquiry stops existing.

```
record()  →  qualify()  →  sendMail()  →  update()
  safe        30s max       can fail      annotation only
```

The outcome — score, intent, escalation, whether the alert sent — is attached
afterwards. If that update fails, the enquiry is still recorded and only the
annotation is lost.

This was the wrong way round until it was measured: the model ran first, so
anything that threw between the model call and the write lost the lead outright.

## What happens when it is not configured

Nothing breaks. `record()` reports that it stored nothing and the request carries
on, because logging must never be the reason an enquiry fails to reach a human.

The one case that changes: if the alert also fails to send, the endpoint now
returns a 502 and tells the customer to email the business directly, instead of
thanking them for an enquiry that no longer exists anywhere.
