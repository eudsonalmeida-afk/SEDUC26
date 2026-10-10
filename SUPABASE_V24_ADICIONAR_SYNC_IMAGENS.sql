-- SEDUC2026 V24 — execute uma vez no SQL Editor do Supabase

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
