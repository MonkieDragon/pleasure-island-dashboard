-- QUICKFIX (temporary / insecure):
-- Create a public bucket for step images and allow anon read/write.
-- Tighten this once Auth + proper RLS is added.

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'step-images'
  ) then
    insert into storage.buckets (id, name, public)
    values ('step-images', 'step-images', true);
  end if;
end $$;

-- Allow anon to read/write objects in this bucket.
do $$
begin
  -- SELECT (read)
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public read step-images (quickfix)'
  ) then
    create policy "public read step-images (quickfix)"
    on storage.objects
    as permissive
    for select
    to anon
    using (bucket_id = 'step-images');
  end if;

  -- INSERT (upload)
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public insert step-images (quickfix)'
  ) then
    create policy "public insert step-images (quickfix)"
    on storage.objects
    as permissive
    for insert
    to anon
    with check (bucket_id = 'step-images');
  end if;

  -- UPDATE (optional; enables overwriting / metadata updates)
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public update step-images (quickfix)'
  ) then
    create policy "public update step-images (quickfix)"
    on storage.objects
    as permissive
    for update
    to anon
    using (bucket_id = 'step-images')
    with check (bucket_id = 'step-images');
  end if;

  -- DELETE (optional; enables cleanup)
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public delete step-images (quickfix)'
  ) then
    create policy "public delete step-images (quickfix)"
    on storage.objects
    as permissive
    for delete
    to anon
    using (bucket_id = 'step-images');
  end if;
end $$;

