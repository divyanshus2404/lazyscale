-- LazyScale app tables: tenants and leads.
--
-- Run this in the Supabase SQL editor once. It matches the code exactly, so the
-- REST calls in api/_tenants.js, api/_leads.js and api/session.js work without
-- any further mapping. The existing `enquiries` table (data/supabase-schema.sql)
-- is unchanged and still the durable receipt; `leads` is the living thing worked
-- on top of it, linked by enquiry_id.
--
-- Column names are quoted where the code uses camelCase ("accessToken",
-- "ownerEmail"), because PostgREST matches the exact column name.

-- ── tenants: one row per business ────────────────────────────────────────────
create table if not exists public.tenants (
  key           text primary key,              -- e.g. 'glow' (used in URLs, keys)
  name          text,
  vertical      text default 'general',        -- general | clinic | ivf | property
  config        jsonb default '{}'::jsonb,     -- per-tenant overrides
  "accessToken" text,                          -- the secret half of the access key
  "ownerEmail"  text,                          -- who this tenant belongs to (login)
  members       jsonb default '[]'::jsonb,     -- extra staff emails allowed in
  created_at    timestamptz default now()
);

create index if not exists tenants_owner_idx on public.tenants ("ownerEmail");

-- ── leads: one row per enquiry being worked ──────────────────────────────────
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  tenant_key        text not null,
  enquiry_id        uuid,                       -- links back to enquiries.id
  name              text,
  email             text,
  phone             text,
  contact           text,
  channel           text,
  message           text,
  score             numeric,
  intent            text,
  needs_human       boolean default false,
  reply_draft       text,
  last_draft        text,                       -- last follow-up the engine wrote
  status            text default 'new',         -- new|following_up|engaged|handed_to_human|closed
  attempts          integer default 0,
  replied           boolean default false,
  opted_out         boolean default false,
  closed_reason     text,
  last_inbound_at   timestamptz,
  last_attempt_at   timestamptz,
  created_at        timestamptz default now(),
  sequence_start_at timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists leads_tenant_idx  on public.leads (tenant_key, created_at desc);
create index if not exists leads_status_idx  on public.leads (tenant_key, status);
create index if not exists leads_enquiry_idx on public.leads (enquiry_id);

-- ── row-level security ───────────────────────────────────────────────────────
-- Enabled with no public policy: only the service role (used server-side by the
-- API) can read or write. The browser never touches these tables directly, so
-- there is nothing to expose. This is the same posture as the enquiries table.
alter table public.tenants enable row level security;
alter table public.leads   enable row level security;

-- ── seed your first tenant (edit, then run) ──────────────────────────────────
-- Generate a strong accessToken first (on your machine):
--   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
-- Then the owner's access key is:  <key>.<accessToken>   e.g.  glow.AbC123...
--
-- insert into public.tenants (key, name, vertical, "accessToken", "ownerEmail")
-- values ('glow', 'Glow Skin Clinic', 'clinic', 'PASTE_ACCESS_TOKEN', 'you@yourclinic.in');
