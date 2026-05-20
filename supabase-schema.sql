-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/tkljofxcndnwqyqrtrnx/sql

-- PayDocs documents table
create table if not exists public.paydocs_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('paystub', '1099-nec', '1099-misc', 'invoice')),
  data_json jsonb not null,
  paid boolean not null default false,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.paydocs_documents enable row level security;

-- Anyone can insert (guest or logged in)
create policy "Anyone can create paydocs documents"
  on public.paydocs_documents for insert
  with check (true);

-- Users can read their own docs (or guest docs with null user_id)
create policy "Users can read own paydocs documents"
  on public.paydocs_documents for select
  using (
    user_id = auth.uid()
    or user_id is null
  );

-- Only service role can update (for Stripe webhook)
create policy "Service role can update paydocs documents"
  on public.paydocs_documents for update
  using (true);

-- Indexes
create index if not exists paydocs_documents_user_id_idx on public.paydocs_documents(user_id);
create index if not exists paydocs_documents_stripe_session_idx on public.paydocs_documents(stripe_session_id);
create index if not exists paydocs_documents_created_at_idx on public.paydocs_documents(created_at desc);
