-- Create a general-purpose `images` storage bucket and cut over image columns.
-- Hard cutover: app will use bucket `images` + deterministic object keys.

-- ---------------------------------------------------------------------------
-- Storage bucket: images (public read; staff-only writes)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'images'
  ) then
    insert into storage.buckets (id, name, public)
    values ('images', 'images', true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read images'
  ) then
    create policy "Public read images"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'images');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Staff insert images'
  ) then
    create policy "Staff insert images"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'images'
        and public.is_editor_or_admin()
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Staff update images'
  ) then
    create policy "Staff update images"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'images'
        and public.is_editor_or_admin()
      )
      with check (
        bucket_id = 'images'
        and public.is_editor_or_admin()
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Staff delete images'
  ) then
    create policy "Staff delete images"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'images'
        and public.is_editor_or_admin()
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Column rename: image_url -> image_path
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'regions'
      and column_name = 'image_url'
  ) then
    alter table public.regions rename column image_url to image_path;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'puzzle_chains'
      and column_name = 'image_url'
  ) then
    alter table public.puzzle_chains rename column image_url to image_path;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'puzzle_steps'
      and column_name = 'image_url'
  ) then
    alter table public.puzzle_steps rename column image_url to image_path;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'treasures'
      and column_name = 'image_url'
  ) then
    alter table public.treasures rename column image_url to image_path;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Constraints (non-blank)
-- ---------------------------------------------------------------------------
alter table public.puzzle_chains
  drop constraint if exists puzzle_chains_image_url_not_blank_chk;

alter table public.puzzle_steps
  drop constraint if exists puzzle_steps_image_url_not_blank_chk;

alter table public.puzzle_chains
  drop constraint if exists puzzle_chains_image_path_not_blank_chk;

alter table public.puzzle_steps
  drop constraint if exists puzzle_steps_image_path_not_blank_chk;

alter table public.treasures
  drop constraint if exists treasures_image_path_not_blank_chk;

alter table public.regions
  drop constraint if exists regions_image_path_not_blank_chk;

alter table public.puzzle_chains
  add constraint puzzle_chains_image_path_not_blank_chk
  check (image_path is null or btrim(image_path) <> '');

alter table public.puzzle_steps
  add constraint puzzle_steps_image_path_not_blank_chk
  check (image_path is null or btrim(image_path) <> '');

alter table public.treasures
  add constraint treasures_image_path_not_blank_chk
  check (image_path is null or btrim(image_path) <> '');

alter table public.regions
  add constraint regions_image_path_not_blank_chk
  check (image_path is null or btrim(image_path) <> '');

