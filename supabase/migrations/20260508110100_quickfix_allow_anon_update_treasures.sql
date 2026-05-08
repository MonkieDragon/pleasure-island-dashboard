-- RLS requires an UPDATE policy for anon dashboard edits (coordinates, fields).
drop policy if exists "public update treasures (quickfix)" on public.treasures;

create policy "public update treasures (quickfix)"
on public.treasures
as permissive
for update
to anon
using (true)
with check (true);
