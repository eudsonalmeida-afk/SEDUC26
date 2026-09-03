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


-- V24 — imagens do Banco separadas do estado principal.
-- Isso evita estourar o localStorage e permite que celular e desktop
-- compartilhem as imagens sem travar o registro do cronograma/blocos.

create table if not exists public.question_images (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  file_name text,
  mime_type text,
  image_data text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.question_images enable row level security;

grant select, insert, update, delete on table public.question_images to authenticated;

drop policy if exists "question_images_select_own" on public.question_images;
create policy "question_images_select_own"
on public.question_images for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "question_images_insert_own" on public.question_images;
create policy "question_images_insert_own"
on public.question_images for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "question_images_update_own" on public.question_images;
create policy "question_images_update_own"
on public.question_images for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "question_images_delete_own" on public.question_images;
create policy "question_images_delete_own"
on public.question_images for delete
to authenticated
using (auth.uid() = user_id);
