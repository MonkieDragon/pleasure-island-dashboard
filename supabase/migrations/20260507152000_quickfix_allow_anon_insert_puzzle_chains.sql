-- QUICKFIX (temporary / insecure):
-- Allow the public/anon client to insert puzzle_chains so the dashboard
-- "Add location" button works without authentication.
-- Remove this once Auth + proper RLS is added.

grant insert on table "public"."puzzle_chains" to "anon";

-- RLS may be enabled on puzzle_chains, so we also need an INSERT policy.
create policy "public insert chains (quickfix)"
on "public"."puzzle_chains"
as permissive
for insert
to anon
with check (true);

