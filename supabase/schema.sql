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

-- Admins & posts (run this second block once, after the portfolios table above already exists).
-- One hardcoded owner account controls who's an admin; admins can author posts that show up
-- in the feed. Replace the UUID below with your own if you ever need to change the owner.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Anyone signed in can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- A user can create their own profile row (e.g. on first login), but can never grant
-- themselves admin at creation time — only the owner account can flip that, via update below.
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id and is_admin = false);

create policy "Only the owner account can change admin status"
  on public.profiles for update
  using (auth.uid() = 'ecb6cf68-a5e8-4eeb-a752-7d472a2e0c0a')
  with check (auth.uid() = 'ecb6cf68-a5e8-4eeb-a752-7d472a2e0c0a');

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  headline text not null,
  body text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Anyone signed in can read posts"
  on public.posts for select
  to authenticated
  using (true);

-- The owner account always counts as an admin here too, even without a profiles row.
create policy "Admins can create posts"
  on public.posts for insert
  with check (
    auth.uid() = author_id
    and (
      auth.uid() = 'ecb6cf68-a5e8-4eeb-a752-7d472a2e0c0a'
      or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
    )
  );

create policy "Admins can delete their own posts"
  on public.posts for delete
  using (
    auth.uid() = author_id
    and (
      auth.uid() = 'ecb6cf68-a5e8-4eeb-a752-7d472a2e0c0a'
      or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
    )
  );

-- Run this once — lets an author update their own posts (used to relabel your byline
-- everywhere at once when you change your display name).
create policy "Authors can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Run this once — lets the leaderboard show real display names and credit scores across every
-- signed-in user, not just you. The profiles table is already readable by anyone signed in
-- (see "Anyone signed in can read profiles" above); this just adds the columns and lets each
-- user keep their own row's name/score current.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists score numeric;

-- Users can update their own display_name/score. This is deliberately a *second*, additive
-- policy (Postgres OR's permissive policies together) rather than a replacement for the
-- owner-only one above — the trigger below is what actually stops a non-owner from sneaking an
-- is_admin change through this same policy.
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.protect_is_admin()
returns trigger as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.uid() <> 'ecb6cf68-a5e8-4eeb-a752-7d472a2e0c0a' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_is_admin_trigger on public.profiles;
create trigger protect_is_admin_trigger
  before update on public.profiles
  for each row execute function public.protect_is_admin();
