-- QUICKFIX (temporary / insecure):
-- Allow the public/anon client to insert puzzle_steps so the dashboard "Add step"
-- button works without authentication. Remove this once Auth + proper RLS is added.

-- Required because an earlier migration revokes insert from anon.
grant insert on table "public"."puzzle_steps" to "anon";

-- RLS is enabled on puzzle_steps, so we also need an INSERT policy.
create policy "public insert steps (quickfix)"
on "public"."puzzle_steps"
as permissive
for insert
to anon
with check (true);
