-- Profiles, auth sync, role helper, and RLS replacing anon dashboard quickfixes.

-- ---------------------------------------------------------------------------
-- Drop legacy / duplicate policies (public puzzle content + quickfixes)
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public read chains" on public.puzzle_chains;
drop policy if exists "public read chains" on public.puzzle_chains;
drop policy if exists "public insert chains (quickfix)" on public.puzzle_chains;
drop policy if exists "public update chains" on public.puzzle_chains;

drop policy if exists "Allow public read steps" on public.puzzle_steps;
drop policy if exists "public read steps" on public.puzzle_steps;
drop policy if exists "public insert steps (quickfix)" on public.puzzle_steps;
drop policy if exists "public update steps (quickfix)" on public.puzzle_steps;
drop policy if exists "public delete steps (quickfix)" on public.puzzle_steps;

drop policy if exists "allow service role full access" on public.regions;
drop policy if exists "service role full access" on public.regions;
drop policy if exists "public read regions" on public.regions;

drop policy if exists "public read treasures (quickfix)" on public.treasures;
drop policy if exists "public insert treasures (quickfix)" on public.treasures;
drop policy if exists "public update treasures (quickfix)" on public.treasures;

drop policy if exists "public read step-images (quickfix)" on storage.objects;
drop policy if exists "public insert step-images (quickfix)" on storage.objects;
drop policy if exists "public update step-images (quickfix)" on storage.objects;
drop policy if exists "public delete step-images (quickfix)" on storage.objects;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'player'
    constraint profiles_role_chk check (role in ('player', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'player');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, role)
select id, 'player'::text from auth.users
on conflict (id) do nothing;

create policy "Users read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Role helper for RLS (must run before policies that reference it)
-- ---------------------------------------------------------------------------
create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  );
$$;

grant execute on function public.is_editor_or_admin() to anon;
grant execute on function public.is_editor_or_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges: anon read-only catalog; authenticated read + staff writes via RLS
-- ---------------------------------------------------------------------------
grant select on table public.regions to anon;
grant select on table public.regions to authenticated;

grant select on table public.puzzle_chains to anon;
grant select on table public.puzzle_chains to authenticated;
grant insert, update, delete on table public.puzzle_chains to authenticated;

grant select on table public.puzzle_steps to anon;
grant select on table public.puzzle_steps to authenticated;
grant insert, update, delete on table public.puzzle_steps to authenticated;

grant select on table public.treasures to anon;
grant select on table public.treasures to authenticated;
grant insert, update, delete on table public.treasures to authenticated;

revoke insert, update, delete on table public.regions from anon;
revoke update, delete on table public.regions from authenticated;

grant insert on table public.regions to authenticated;

revoke insert, update, delete on table public.puzzle_chains from anon;
revoke insert, update, delete on table public.puzzle_steps from anon;
revoke insert, update, delete on table public.treasures from anon;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- regions: public read; staff may create (dashboard "Add region")
create policy "Public read regions"
  on public.regions
  for select
  to anon, authenticated
  using (true);

create policy "Staff insert regions"
  on public.regions
  for insert
  to authenticated
  with check (public.is_editor_or_admin());

-- puzzle_chains
create policy "Public read puzzle_chains"
  on public.puzzle_chains
  for select
  to anon, authenticated
  using (true);

create policy "Staff insert puzzle_chains"
  on public.puzzle_chains
  for insert
  to authenticated
  with check (public.is_editor_or_admin());

create policy "Staff update puzzle_chains"
  on public.puzzle_chains
  for update
  to authenticated
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

create policy "Staff delete puzzle_chains"
  on public.puzzle_chains
  for delete
  to authenticated
  using (public.is_editor_or_admin());

-- puzzle_steps
create policy "Public read puzzle_steps"
  on public.puzzle_steps
  for select
  to anon, authenticated
  using (true);

create policy "Staff insert puzzle_steps"
  on public.puzzle_steps
  for insert
  to authenticated
  with check (public.is_editor_or_admin());

create policy "Staff update puzzle_steps"
  on public.puzzle_steps
  for update
  to authenticated
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

create policy "Staff delete puzzle_steps"
  on public.puzzle_steps
  for delete
  to authenticated
  using (public.is_editor_or_admin());

-- treasures
create policy "Public read treasures"
  on public.treasures
  for select
  to anon, authenticated
  using (true);

create policy "Staff insert treasures"
  on public.treasures
  for insert
  to authenticated
  with check (public.is_editor_or_admin());

create policy "Staff update treasures"
  on public.treasures
  for update
  to authenticated
  using (public.is_editor_or_admin())
  with check (public.is_editor_or_admin());

create policy "Staff delete treasures"
  on public.treasures
  for delete
  to authenticated
  using (public.is_editor_or_admin());

create policy "Players update assigned treasures"
  on public.treasures
  for update
  to authenticated
  using (assigned_to is not null and assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: step-images — public read; staff-only writes
-- ---------------------------------------------------------------------------
create policy "Public read step-images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'step-images');

create policy "Staff insert step-images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'step-images'
    and public.is_editor_or_admin()
  );

create policy "Staff update step-images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'step-images'
    and public.is_editor_or_admin()
  )
  with check (
    bucket_id = 'step-images'
    and public.is_editor_or_admin()
  );

create policy "Staff delete step-images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'step-images'
    and public.is_editor_or_admin()
  );
