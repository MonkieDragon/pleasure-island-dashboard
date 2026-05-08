-- Quickfix: allow the dashboard (anon) to create treasures.
-- The dashboard currently uses the anon key, so inserts run as role `anon`.

grant select, insert on table public.treasures to anon;

-- Ensure anon can read treasures (some environments may not have a select policy).
create policy "public read treasures (quickfix)"
on public.treasures
as permissive
for select
to anon
using (true);

create policy "public insert treasures (quickfix)"
on public.treasures
as permissive
for insert
to anon
with check (true);

