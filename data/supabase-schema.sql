-- LazyScale — Supabase schema
--
-- Paste this whole file into the Supabase SQL editor and press Run. It creates
-- the one table the code reads and writes (api/_store.js, TABLE = 'enquiries'),
-- with every column matched to what the endpoints actually send.
--
-- Safe to run more than once: it only creates things that do not already exist.

create extension if not exists "pgcrypto";  -- for gen_random_uuid()

create table if not exists public.enquiries (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),

  -- who it belongs to
  tenant_key        text not null,
  tenant_name       text,

  -- the enquiry itself
  name              text,
  email             text,
  phone             text,
  message           text,
  extra             jsonb,           -- unmapped form fields, kept as-is
  source            text,            -- "web form", "whatsapp", "email", ...
  forwarded_by      text,            -- set when recovered from a forwarded email
  fingerprint       text,            -- dedup hash; not reversible

  -- what happened to it (filled in after capture)
  scored            boolean default false,
  score             numeric,
  intent            text,
  needs_human       boolean,
  escalation_reason text,
  reply_draft       text,
  alert_sent        boolean default false,
  auto_replied      boolean default false
);

-- The two lookups the code does often: by tenant, newest first (console + stats),
-- and by fingerprint within a tenant (duplicate detection).
create index if not exists enquiries_tenant_created_idx
  on public.enquiries (tenant_key, created_at desc);

create index if not exists enquiries_tenant_fingerprint_idx
  on public.enquiries (tenant_key, fingerprint);

-- Lock the table down. The code talks to Supabase with the SERVICE ROLE key,
-- which bypasses row-level security, so enabling RLS with no public policy
-- means: the server can read and write everything, and nobody using the public
-- anon key can read anything. That is exactly what we want — this table holds
-- customers' names, phone numbers and messages.
alter table public.enquiries enable row level security;
