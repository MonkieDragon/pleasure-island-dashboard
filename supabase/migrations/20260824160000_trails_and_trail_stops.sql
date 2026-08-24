-- Trails: ordered playlists of locations (puzzle_chains).
-- Trail metadata moves off puzzle_chains onto trails.

-- ---------------------------------------------------------------------------
-- trails
-- ---------------------------------------------------------------------------
create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  title text not null,
  description text,
  image_path text,
  duration_minutes integer,
  distance_km numeric,
  transport_mode text
    constraint trails_transport_mode_chk
      check (transport_mode is null or transport_mode in ('walk', 'scooter')),
  is_free boolean not null default true,
  ready_to_publish boolean not null default false,
  created_at timestamptz not null default (now() at time zone 'utc')
);

create index if not exists trails_region_id_idx on public.trails (region_id);

-- ---------------------------------------------------------------------------
-- trail_stops (exclusive: a location may belong to at most one trail)
-- ---------------------------------------------------------------------------
create table if not exists public.trail_stops (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails (id) on delete cascade,
  chain_id uuid not null references public.puzzle_chains (id) on delete cascade,
  order_index integer not null,
  constraint trail_stops_trail_chain_unique unique (trail_id, chain_id),
  constraint trail_stops_chain_exclusive unique (chain_id)
);

create index if not exists trail_stops_trail_id_order_idx
  on public.trail_stops (trail_id, order_index);

-- ---------------------------------------------------------------------------
-- Drop trail metadata from puzzle_chains (now owned by trails)
-- ---------------------------------------------------------------------------
alter table public.puzzle_chains
  drop column if exists description,
  drop column if exists duration_minutes,
  drop column if exists distance_km,
  drop column if exists transport_mode,
  drop column if exists is_free;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.trail_region_id(p_trail_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.region_id
  from public.trails t
  where t.id = p_trail_id
  limit 1;
$$;

grant execute on function public.trail_region_id(uuid) to anon;
grant execute on function public.trail_region_id(uuid) to authenticated;

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
  elsif object_name ~ '^trails/[0-9a-f-]{36}\.' then
    v := (substring(object_name from '^trails/([0-9a-f-]{36})'))::uuid;
    return (select t.region_id from public.trails t where t.id = v limit 1);
  end if;
  return null;
end;
$$;

grant execute on function public.storage_object_staff_region(text) to anon;
grant execute on function public.storage_object_staff_region(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
grant select on table public.trails to anon;
grant select on table public.trails to authenticated;
grant insert, update, delete on table public.trails to authenticated;

grant select on table public.trail_stops to anon;
grant select on table public.trail_stops to authenticated;
grant insert, update, delete on table public.trail_stops to authenticated;

alter table public.trails enable row level security;
alter table public.trail_stops enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: trails
-- ---------------------------------------------------------------------------
create policy "Public read trails"
  on public.trails
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or (
      ready_to_publish = true
      and exists (
        select 1
        from public.regions r
        where r.id = trails.region_id
          and r.ready_to_publish = true
      )
    )
  );

create policy "Staff insert trails"
  on public.trails
  for insert
  to authenticated
  with check (public.can_staff_edit_region(region_id));

create policy "Staff update trails"
  on public.trails
  for update
  to authenticated
  using (public.can_staff_edit_region(region_id))
  with check (public.can_staff_edit_region(region_id));

create policy "Staff delete trails"
  on public.trails
  for delete
  to authenticated
  using (public.can_staff_edit_region(region_id));

-- ---------------------------------------------------------------------------
-- RLS: trail_stops
-- ---------------------------------------------------------------------------
create policy "Public read trail_stops"
  on public.trail_stops
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or exists (
      select 1
      from public.trails t
      join public.regions r on r.id = t.region_id
      where t.id = trail_stops.trail_id
        and t.ready_to_publish = true
        and r.ready_to_publish = true
    )
  );

create policy "Staff insert trail_stops"
  on public.trail_stops
  for insert
  to authenticated
  with check (
    public.can_staff_edit_region(public.trail_region_id(trail_id))
  );

create policy "Staff update trail_stops"
  on public.trail_stops
  for update
  to authenticated
  using (public.can_staff_edit_region(public.trail_region_id(trail_id)))
  with check (public.can_staff_edit_region(public.trail_region_id(trail_id)));

create policy "Staff delete trail_stops"
  on public.trail_stops
  for delete
  to authenticated
  using (public.can_staff_edit_region(public.trail_region_id(trail_id)));
