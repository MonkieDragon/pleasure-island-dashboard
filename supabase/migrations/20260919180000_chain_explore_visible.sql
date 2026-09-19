-- Explore visibility: shared puzzle pins can appear on trails AND in Explore.
-- trail-only locations use explore_visible = false (narrative glue / exclusive beats).

alter table public.puzzle_chains
  add column if not exists explore_visible boolean not null default true;

comment on column public.puzzle_chains.explore_visible is
  'When true, published location appears in player Explore. When false, trail-only.';
