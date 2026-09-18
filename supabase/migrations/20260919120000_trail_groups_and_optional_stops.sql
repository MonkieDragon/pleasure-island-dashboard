-- Trail variant groups + optional stops; allow a location on multiple trails.

-- ---------------------------------------------------------------------------
-- trail_groups (catalog family for 1–N variant trails)
-- ---------------------------------------------------------------------------
create table if not exists public.trail_groups (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete cascade,
  title text not null,
  description text,
  image_path text,
  sort_index integer not null default 0,
  created_at timestamptz not null default (now() at time zone 'utc')
);

create index if not exists trail_groups_region_id_idx
  on public.trail_groups (region_id);

-- ---------------------------------------------------------------------------
-- trails: optional group membership + variant label
-- ---------------------------------------------------------------------------
alter table public.trails
  add column if not exists trail_group_id uuid references public.trail_groups (id) on delete set null,
  add column if not exists variant_label text,
  add column if not exists variant_sort integer not null default 0;

create index if not exists trails_trail_group_id_idx
  on public.trails (trail_group_id);

-- ---------------------------------------------------------------------------
-- trail_stops: optional flag; drop global exclusivity
-- ---------------------------------------------------------------------------
alter table public.trail_stops
  add column if not exists optional boolean not null default false;

alter table public.trail_stops
  drop constraint if exists trail_stops_chain_exclusive;

-- ---------------------------------------------------------------------------
-- Privileges + RLS: trail_groups
-- ---------------------------------------------------------------------------
grant select on table public.trail_groups to anon;
grant select on table public.trail_groups to authenticated;
grant insert, update, delete on table public.trail_groups to authenticated;

alter table public.trail_groups enable row level security;

create policy "Public read trail_groups"
  on public.trail_groups
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or exists (
      select 1
      from public.regions r
      where r.id = trail_groups.region_id
        and r.ready_to_publish = true
    )
  );

create policy "Staff insert trail_groups"
  on public.trail_groups
  for insert
  to authenticated
  with check (public.can_staff_edit_region(region_id));

create policy "Staff update trail_groups"
  on public.trail_groups
  for update
  to authenticated
  using (public.can_staff_edit_region(region_id))
  with check (public.can_staff_edit_region(region_id));

create policy "Staff delete trail_groups"
  on public.trail_groups
  for delete
  to authenticated
  using (public.can_staff_edit_region(region_id));
