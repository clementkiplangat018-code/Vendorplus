-- ═══════════════════════════════════════════════════════
--  VendorPlus — Supabase Database Setup
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════

-- 1. PROFILES TABLE (users with roles)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default 'agent' check (role in ('admin','agent')),
  online      boolean default false,
  created_at  timestamptz default now()
);

-- 2. METHODS TABLE (payment methods)
create table if not exists public.methods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  ico         text,
  cat         text,
  agent       text,
  fee         numeric default 0,
  account     text,
  acct_name   text,
  status      text default 'active' check (status in ('active','paused')),
  meta        text,
  tags        text[],
  created_at  timestamptz default now()
);

-- 3. TRANSACTIONS TABLE
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  ref         text unique not null,
  sender      text,
  method      text,
  method_id   uuid references public.methods(id),
  amount      text,
  currency    text,
  ico         text,
  status      text default 'pending' check (status in ('pending','processing','confirmed','dispute','expired')),
  proof_url   text,
  agent_id    uuid references public.profiles(id),
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── AUTO-UPDATE updated_at ──────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_txn_updated on public.transactions;
create trigger trg_txn_updated
  before update on public.transactions
  for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY ─────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.methods     enable row level security;
alter table public.transactions enable row level security;

-- PROFILES: users can read all, only edit own row
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- METHODS: anyone can read, only authenticated users can write
create policy "methods_read_all"    on public.methods for select using (true);
create policy "methods_write_auth"  on public.methods for all using (auth.role() = 'authenticated');

-- TRANSACTIONS: anyone can insert (clients), auth users can update
create policy "txn_read_all"        on public.transactions for select using (true);
create policy "txn_insert_all"      on public.transactions for insert with check (true);
create policy "txn_update_auth"     on public.transactions for update using (auth.role() = 'authenticated');

-- ── REALTIME ───────────────────────────────────────────
-- Enable realtime for live cross-page updates
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.methods;
alter publication supabase_realtime add table public.profiles;

-- ═══════════════════════════════════════════════════════
--  SEED: Create your admin account
--  IMPORTANT: First sign up via the website, then run:
-- ═══════════════════════════════════════════════════════
-- update public.profiles set role = 'admin' where name = 'YOUR_NAME';
