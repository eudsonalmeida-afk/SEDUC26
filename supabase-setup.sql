-- SEDUC 2026 — sincronização segura por usuário
-- Execute uma vez no SQL Editor do seu projeto Supabase.

create table if not exists public.study_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.study_state enable row level security;

grant select, insert, update on table public.study_state to authenticated;

drop policy if exists "study_state_select_own" on public.study_state;
create policy "study_state_select_own"
on public.study_state for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "study_state_insert_own" on public.study_state;
create policy "study_state_insert_own"
on public.study_state for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "study_state_update_own" on public.study_state;
create policy "study_state_update_own"
on public.study_state for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
