-- optional: main vs optional locations for player prominence
-- is_eatery: cafe/bar/restaurant vs generic attraction (map icon shape)

alter table public.puzzle_chains
  add column if not exists optional boolean not null default true;

alter table public.puzzle_chains
  add column if not exists is_eatery boolean not null default false;
