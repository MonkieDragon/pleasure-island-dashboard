-- Trail detail: show_trail, is_loop, highlights; gallery table trail_images.

-- ---------------------------------------------------------------------------
-- trails: new columns
-- ---------------------------------------------------------------------------
alter table public.trails
  add column if not exists show_trail boolean not null default true,
  add column if not exists is_loop boolean not null default false,
  add column if not exists highlights text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- trail_images (ordered gallery; cover stays on trails.image_path)
-- ---------------------------------------------------------------------------
create table if not exists public.trail_images (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails (id) on delete cascade,
  image_path text not null,
  order_index integer not null,
  created_at timestamptz not null default (now() at time zone 'utc')
);

create index if not exists trail_images_trail_id_order_idx
  on public.trail_images (trail_id, order_index);

grant select on table public.trail_images to anon;
grant select on table public.trail_images to authenticated;
grant insert, update, delete on table public.trail_images to authenticated;

alter table public.trail_images enable row level security;

create policy "Public read trail_images"
  on public.trail_images
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or exists (
      select 1
      from public.trails t
      join public.regions r on r.id = t.region_id
      where t.id = trail_images.trail_id
        and t.ready_to_publish = true
        and r.ready_to_publish = true
    )
  );

create policy "Staff insert trail_images"
  on public.trail_images
  for insert
  to authenticated
  with check (
    public.can_staff_edit_region(public.trail_region_id(trail_id))
  );

create policy "Staff update trail_images"
  on public.trail_images
  for update
  to authenticated
  using (public.can_staff_edit_region(public.trail_region_id(trail_id)))
  with check (public.can_staff_edit_region(public.trail_region_id(trail_id)));

create policy "Staff delete trail_images"
  on public.trail_images
  for delete
  to authenticated
  using (public.can_staff_edit_region(public.trail_region_id(trail_id)));

-- ---------------------------------------------------------------------------
-- Storage: trails/{trailId}.* cover and trails/{trailId}/gallery/* gallery
-- ---------------------------------------------------------------------------
create or replace function public.storage_object_staff_region(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v uuid;
begin
  if object_name ~ '^chains/[0-9a-f-]{36}\.' then
    v := (substring(object_name from '^chains/([0-9a-f-]{36})'))::uuid;
    return (select c.region_id from public.puzzle_chains c where c.id = v limit 1);
  elsif object_name ~ '^steps/[0-9a-f-]{36}\.' then
    v := (substring(object_name from '^steps/([0-9a-f-]{36})'))::uuid;
    return (
      select pc.region_id
      from public.puzzle_steps s
      join public.puzzle_chains pc on pc.id = s.chain_id
      where s.id = v
      limit 1
    );
  elsif object_name ~ '^treasures/[0-9a-f-]{36}\.' then
    v := (substring(object_name from '^treasures/([0-9a-f-]{36})'))::uuid;
    return (select t.region_id from public.treasures t where t.id = v limit 1);
  elsif object_name ~ '^regions/[0-9a-f-]{36}\.' then
    v := (substring(object_name from '^regions/([0-9a-f-]{36})'))::uuid;
    return v;
  elsif object_name ~ '^trails/[0-9a-f-]{36}(/|\.)' then
    -- Cover: trails/{id}.ext  |  Gallery: trails/{id}/gallery/{uuid}.ext
    v := (substring(object_name from '^trails/([0-9a-f-]{36})'))::uuid;
    return (select t.region_id from public.trails t where t.id = v limit 1);
  end if;
  return null;
end;
$$;

grant execute on function public.storage_object_staff_region(text) to anon;
grant execute on function public.storage_object_staff_region(text) to authenticated;
