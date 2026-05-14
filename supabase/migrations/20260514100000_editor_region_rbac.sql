-- Editor default on signup/invite, per-region editor access, admin profile management.

-- ---------------------------------------------------------------------------
-- 1) Profiles: email mirror + default role for new users = editor
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, email)
  values (new.id, 'editor', new.email)
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

create or replace function public.handle_auth_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_updated();

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is distinct from u.email);

-- ---------------------------------------------------------------------------
-- 2) Role / region helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
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
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2b) editor_region_access (before can_staff_edit_region)
-- ---------------------------------------------------------------------------
create table if not exists public.editor_region_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, region_id)
);

alter table public.editor_region_access enable row level security;

grant select, insert, update, delete on table public.editor_region_access to authenticated;

create policy "Users read own region access"
  on public.editor_region_access
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins read all region access"
  on public.editor_region_access
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins insert region access"
  on public.editor_region_access
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins delete region access"
  on public.editor_region_access
  for delete
  to authenticated
  using (public.is_admin());

insert into public.editor_region_access (user_id, region_id)
select p.id, r.id
from public.profiles p
cross join public.regions r
where p.role = 'editor'
on conflict do nothing;

create or replace function public.can_staff_edit_region(region_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then true
    when can_staff_edit_region.region_id is null then false
    else exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'editor'
        and exists (
          select 1
          from public.editor_region_access g
          where g.user_id = p.id
            and g.region_id = can_staff_edit_region.region_id
        )
    )
  end;
$$;

grant execute on function public.can_staff_edit_region(uuid) to anon;
grant execute on function public.can_staff_edit_region(uuid) to authenticated;

create or replace function public.puzzle_chain_region_id(p_chain_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.region_id
  from public.puzzle_chains c
  where c.id = p_chain_id
  limit 1;
$$;

grant execute on function public.puzzle_chain_region_id(uuid) to anon;
grant execute on function public.puzzle_chain_region_id(uuid) to authenticated;

create or replace function public.puzzle_step_region_id(p_step_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pc.region_id
  from public.puzzle_steps s
  join public.puzzle_chains pc on pc.id = s.chain_id
  where s.id = p_step_id
  limit 1;
$$;

grant execute on function public.puzzle_step_region_id(uuid) to anon;
grant execute on function public.puzzle_step_region_id(uuid) to authenticated;

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
  end if;
  return null;
end;
$$;

grant execute on function public.storage_object_staff_region(text) to anon;
grant execute on function public.storage_object_staff_region(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Profiles: admin policies + self role guard
-- ---------------------------------------------------------------------------
grant update on table public.profiles to authenticated;

create policy "Admins read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.profiles_prevent_self_role_change()
returns trigger
language plpgsql
as $$
begin
  if old.id = auth.uid() and new.role is distinct from old.role then
    raise exception 'Cannot change your own role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_role_change on public.profiles;
create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row
  execute function public.profiles_prevent_self_role_change();

-- ---------------------------------------------------------------------------
-- 5) Replace staff RLS on regions / puzzle / treasures
-- ---------------------------------------------------------------------------
drop policy if exists "Staff insert regions" on public.regions;

create policy "Admins insert regions"
  on public.regions
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Staff insert puzzle_chains" on public.puzzle_chains;
drop policy if exists "Staff update puzzle_chains" on public.puzzle_chains;
drop policy if exists "Staff delete puzzle_chains" on public.puzzle_chains;

create policy "Staff insert puzzle_chains"
  on public.puzzle_chains
  for insert
  to authenticated
  with check (public.can_staff_edit_region(region_id));

create policy "Staff update puzzle_chains"
  on public.puzzle_chains
  for update
  to authenticated
  using (public.can_staff_edit_region(region_id))
  with check (public.can_staff_edit_region(region_id));

create policy "Staff delete puzzle_chains"
  on public.puzzle_chains
  for delete
  to authenticated
  using (public.can_staff_edit_region(region_id));

drop policy if exists "Staff insert puzzle_steps" on public.puzzle_steps;
drop policy if exists "Staff update puzzle_steps" on public.puzzle_steps;
drop policy if exists "Staff delete puzzle_steps" on public.puzzle_steps;

create policy "Staff insert puzzle_steps"
  on public.puzzle_steps
  for insert
  to authenticated
  with check (
    public.can_staff_edit_region(
      (select pc.region_id from public.puzzle_chains pc where pc.id = puzzle_steps.chain_id)
    )
  );

create policy "Staff update puzzle_steps"
  on public.puzzle_steps
  for update
  to authenticated
  using (
    public.can_staff_edit_region(
      (select pc.region_id from public.puzzle_chains pc where pc.id = puzzle_steps.chain_id)
    )
  )
  with check (
    public.can_staff_edit_region(
      (select pc.region_id from public.puzzle_chains pc where pc.id = puzzle_steps.chain_id)
    )
  );

create policy "Staff delete puzzle_steps"
  on public.puzzle_steps
  for delete
  to authenticated
  using (
    public.can_staff_edit_region(
      (select pc.region_id from public.puzzle_chains pc where pc.id = puzzle_steps.chain_id)
    )
  );

drop policy if exists "Staff insert treasures" on public.treasures;
drop policy if exists "Staff update treasures" on public.treasures;
drop policy if exists "Staff delete treasures" on public.treasures;

create policy "Staff insert treasures"
  on public.treasures
  for insert
  to authenticated
  with check (public.can_staff_edit_region(region_id));

create policy "Staff update treasures"
  on public.treasures
  for update
  to authenticated
  using (public.can_staff_edit_region(region_id))
  with check (public.can_staff_edit_region(region_id));

create policy "Staff delete treasures"
  on public.treasures
  for delete
  to authenticated
  using (public.can_staff_edit_region(region_id));

-- ---------------------------------------------------------------------------
-- 6) Storage: staff policies for images + step-images
-- ---------------------------------------------------------------------------
drop policy if exists "Staff insert step-images" on storage.objects;
drop policy if exists "Staff update step-images" on storage.objects;
drop policy if exists "Staff delete step-images" on storage.objects;

create policy "Staff insert step-images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'step-images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  );

create policy "Staff update step-images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'step-images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  )
  with check (
    bucket_id = 'step-images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  );

create policy "Staff delete step-images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'step-images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  );

drop policy if exists "Staff insert images" on storage.objects;
drop policy if exists "Staff update images" on storage.objects;
drop policy if exists "Staff delete images" on storage.objects;

create policy "Staff insert images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  );

create policy "Staff update images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  )
  with check (
    bucket_id = 'images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  );

create policy "Staff delete images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'images'
    and (
      public.is_admin()
      or public.can_staff_edit_region(public.storage_object_staff_region(name))
    )
  );
