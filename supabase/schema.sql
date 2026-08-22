-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor > New query).
-- One row per user, holding their whole portfolio as JSON — mirrors the localStorage shape
-- exactly, so syncing is just "upload this blob" / "download this blob".

create table if not exists public.portfolios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

create policy "Users can read their own portfolio"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "Users can insert their own portfolio"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own portfolio"
  on public.portfolios for update
  using (auth.uid() = user_id);
