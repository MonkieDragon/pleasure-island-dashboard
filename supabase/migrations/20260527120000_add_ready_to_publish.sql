-- ready_to_publish: draft vs live for player app catalog visibility.

alter table public.regions
  add column if not exists ready_to_publish boolean not null default true;

alter table public.puzzle_chains
  add column if not exists ready_to_publish boolean not null default true;

-- Staff may update regions (e.g. ready_to_publish); region-scoped for editors.
grant update on table public.regions to authenticated;

create policy "Staff update regions"
  on public.regions
  for update
  to authenticated
  using (public.can_staff_edit_region(id))
  with check (public.can_staff_edit_region(id));

-- Replace blanket public read with staff-see-all / players-see-published-only.

drop policy if exists "Public read regions" on public.regions;

create policy "Public read regions"
  on public.regions
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or ready_to_publish = true
  );

drop policy if exists "Public read puzzle_chains" on public.puzzle_chains;

create policy "Public read puzzle_chains"
  on public.puzzle_chains
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or (
      ready_to_publish = true
      and exists (
        select 1
        from public.regions r
        where r.id = puzzle_chains.region_id
          and r.ready_to_publish = true
      )
    )
  );

drop policy if exists "Public read puzzle_steps" on public.puzzle_steps;

create policy "Public read puzzle_steps"
  on public.puzzle_steps
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or exists (
      select 1
      from public.puzzle_chains pc
      join public.regions r on r.id = pc.region_id
      where pc.id = puzzle_steps.chain_id
        and pc.ready_to_publish = true
        and r.ready_to_publish = true
    )
  );

drop policy if exists "Public read treasures" on public.treasures;

create policy "Public read treasures"
  on public.treasures
  for select
  to anon, authenticated
  using (
    public.is_editor_or_admin()
    or exists (
      select 1
      from public.regions r
      where r.id = treasures.region_id
        and r.ready_to_publish = true
    )
  );
