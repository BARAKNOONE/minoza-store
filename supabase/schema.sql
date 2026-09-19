-- Minoza Store — Supabase schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- before the first deploy. Safe to re-run (uses IF NOT EXISTS).

create table if not exists products (
  id text primary key,
  slug text unique not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  order_id text primary key,
  data jsonb not null,
  amount numeric not null default 0,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into site_settings (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

-- Row Level Security: the server talks to Supabase with the SERVICE ROLE
-- key, which bypasses RLS, so keep RLS enabled and add no public policies.
-- This keeps the tables inaccessible to anyone using the anon/public key
-- (e.g. if it ever leaks into client-side code).
alter table products enable row level security;
alter table orders enable row level security;
alter table site_settings enable row level security;

create table if not exists admins (
  id text primary key,
  username text unique not null,
  password_hash text not null,
  name text,
  role text default 'admin',
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- Storage bucket for admin-uploaded product images (server/routes/upload.js).
-- Create it once (Project > Storage > New bucket), name: uploads, Public: ON.
-- Or run:
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
--   on conflict (id) do nothing;
