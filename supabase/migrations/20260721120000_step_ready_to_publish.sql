-- Per-step draft vs live; location (chain) remains the master visibility switch.

alter table public.puzzle_steps
  add column if not exists ready_to_publish boolean not null default false;

-- Align chain default with app inserts (new locations start as draft).
alter table public.puzzle_chains
  alter column ready_to_publish set default false;

-- Existing live locations keep their steps visible to players.
update public.puzzle_steps s
set ready_to_publish = true
from public.puzzle_chains pc
where s.chain_id = pc.id
  and pc.ready_to_publish = true
  and s.ready_to_publish = false;

drop policy if exists "Public read puzzle_steps" on public.puzzle_steps;

create policy "Public read puzzle_steps"
  on public.puzzle_steps
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or (
      ready_to_publish = true
      and exists (
        select 1
        from public.puzzle_chains pc
        join public.regions r on r.id = pc.region_id
        where pc.id = puzzle_steps.chain_id
          and pc.ready_to_publish = true
          and r.ready_to_publish = true
      )
    )
  );
