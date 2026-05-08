-- QUICKFIX (temporary / insecure):
-- Allow the public/anon client to delete puzzle_steps so the dashboard "Delete step"
-- action works without authentication. Remove this once Auth + proper RLS is added.

grant delete on table "public"."puzzle_steps" to "anon";

-- RLS is enabled on puzzle_steps, so we also need a DELETE policy.
create policy "public delete steps (quickfix)"
on "public"."puzzle_steps"
as permissive
for delete
to anon
using (true);

