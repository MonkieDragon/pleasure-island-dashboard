-- place_type: Google-style category for locations (replaces is_eatery boolean)

alter table public.puzzle_chains
  add column if not exists place_type text;

update public.puzzle_chains
set place_type = case
  when is_eatery = true then 'eatery'
  else 'other'
end
where place_type is null;

alter table public.puzzle_chains
  alter column place_type set default 'other';

alter table public.puzzle_chains
  alter column place_type set not null;

alter table public.puzzle_chains
  drop constraint if exists puzzle_chains_place_type_chk;

alter table public.puzzle_chains
  add constraint puzzle_chains_place_type_chk
  check (
    place_type in (
      'landmark',
      'art',
      'eatery',
      'market',
      'nature',
      'shop',
      'other'
    )
  );

alter table public.puzzle_chains
  drop column if exists is_eatery;
