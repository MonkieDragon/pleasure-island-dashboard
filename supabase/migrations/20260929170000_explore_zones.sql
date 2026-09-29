-- Zones: named geographic groups of locations within a region (Explore progress buckets).

-- ---------------------------------------------------------------------------
-- zones
-- ---------------------------------------------------------------------------
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  image_path text,
  ready_to_publish boolean not null default false,
  created_at timestamptz not null default (now() at time zone 'utc')
);

create index if not exists zones_region_id_order_idx
  on public.zones (region_id, order_index);

comment on table public.zones is
  'Explore zones: geographic groups of locations within a region. Player Explore progress is counted per zone.';

-- ---------------------------------------------------------------------------
-- puzzle_chains.zone_id
-- ---------------------------------------------------------------------------
alter table public.puzzle_chains
  add column if not exists zone_id uuid references public.zones (id) on delete set null;

create index if not exists puzzle_chains_zone_id_idx on public.puzzle_chains (zone_id);

comment on column public.puzzle_chains.zone_id is
  'Optional Explore zone. Must belong to the same region as the location.';

-- ---------------------------------------------------------------------------
-- Storage: zone cover images (zones/{id}.ext)
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
  elsif object_name ~ '^zones/[0-9a-f-]{36}\.' then
    v := (substring(object_name from '^zones/([0-9a-f-]{36})'))::uuid;
    return (select z.region_id from public.zones z where z.id = v limit 1);
  end if;
  return null;
end;
$$;

grant execute on function public.storage_object_staff_region(text) to anon;
grant execute on function public.storage_object_staff_region(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant select on table public.zones to anon;
grant select on table public.zones to authenticated;
grant insert, update, delete on table public.zones to authenticated;

alter table public.zones enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: zones
-- ---------------------------------------------------------------------------
create policy "Public read zones"
  on public.zones
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or (
      ready_to_publish = true
      and exists (
        select 1
        from public.regions r
        where r.id = zones.region_id
          and r.ready_to_publish = true
      )
    )
  );

create policy "Staff insert zones"
  on public.zones
  for insert
  to authenticated
  with check (public.can_staff_edit_region(region_id));

create policy "Staff update zones"
  on public.zones
  for update
  to authenticated
  using (public.can_staff_edit_region(region_id))
  with check (public.can_staff_edit_region(region_id));

create policy "Staff delete zones"
  on public.zones
  for delete
  to authenticated
  using (public.can_staff_edit_region(region_id));
