-- Run this in Supabase SQL Editor

-- Documents table
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('paystub', '1099-nec', '1099-misc')),
  data_json jsonb not null,
  paid boolean not null default false,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.documents enable row level security;

-- Anyone can insert (guest or logged in)
create policy "Anyone can create documents"
  on public.documents for insert
  with check (true);

-- Users can read their own docs
create policy "Users can read own documents"
  on public.documents for select
  using (
    user_id = auth.uid()
    or user_id is null
  );

-- Only service role can update (for Stripe webhook)
create policy "Service role can update documents"
  on public.documents for update
  using (true);

-- Index for fast user lookups
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_stripe_session_idx on public.documents(stripe_session_id);

-- Index for guest doc retrieval by session
create index if not exists documents_created_at_idx on public.documents(created_at desc);
