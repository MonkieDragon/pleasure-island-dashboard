-- Remove trail groups / variant catalog layer.
-- Keep trail_stops.optional and multi-trail location sharing.

-- ---------------------------------------------------------------------------
-- Ungroup any existing variant trails (titles already include package names)
-- ---------------------------------------------------------------------------
update public.trails
set
  trail_group_id = null,
  variant_label = null;

-- ---------------------------------------------------------------------------
-- Drop trails variant columns
-- ---------------------------------------------------------------------------
drop index if exists public.trails_trail_group_id_idx;

alter table public.trails
  drop column if exists trail_group_id,
  drop column if exists variant_label,
  drop column if exists variant_sort;

-- ---------------------------------------------------------------------------
-- Drop trail_groups (policies, grants, table)
-- ---------------------------------------------------------------------------
drop policy if exists "Public read trail_groups" on public.trail_groups;
drop policy if exists "Staff insert trail_groups" on public.trail_groups;
drop policy if exists "Staff update trail_groups" on public.trail_groups;
drop policy if exists "Staff delete trail_groups" on public.trail_groups;

revoke all on table public.trail_groups from anon, authenticated;

drop table if exists public.trail_groups;
