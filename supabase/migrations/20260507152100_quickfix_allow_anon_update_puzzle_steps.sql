-- QUICKFIX (temporary / insecure):
-- Allow public/anon client to update puzzle_steps so step marker dragging
-- persists without authentication.
-- Remove this once Auth + proper RLS is added.

grant update on table "public"."puzzle_steps" to "anon";

create policy "public update steps (quickfix)"
on "public"."puzzle_steps"
as permissive
for update
to anon
using (true)
with check (true);

