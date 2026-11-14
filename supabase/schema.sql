-- Aurora Vale: cloud sync for the save (store.js). Run this once in the
-- Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query -> Run).
--
-- Identity: visitors never create a real account. The client calls
-- supabase.auth.signInAnonymously() once; Supabase issues a persistent
-- anonymous user with a real auth.uid(), stored in the browser by
-- supabase-js itself. Row Level Security below ties every row to that
-- uid, so one visitor can never read or overwrite another's save --
-- no shared secret, no guessable id, enforced by Postgres itself.
--
-- Must be enabled first in the dashboard: Authentication -> Sign In / Providers
-- -> Anonymous Sign-Ins -> toggle on. (This SQL alone does not turn it on.)

create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  doc jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves
  for select
  using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- no delete policy: a visitor can overwrite their save but not remove the row;
-- harmless either way since the schema is tiny and the table has no PII.

-- keeps updated_at honest even if the client forgets to set it
create or replace function public.touch_saves_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists saves_touch_updated_at on public.saves;
create trigger saves_touch_updated_at
  before update on public.saves
  for each row execute function public.touch_saves_updated_at();
