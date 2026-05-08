alter table "public"."regions" add column "latitude" double precision not null;

alter table "public"."regions" add column "longitude" double precision not null;

grant update on table "public"."puzzle_chains" to "anon";

grant update on table "public"."puzzle_chains" to "authenticated";

grant update on table "public"."puzzle_steps" to "anon";

grant select on table "public"."regions" to "anon";

grant select on table "public"."regions" to "authenticated";

grant update on table "public"."treasures" to "anon";


  create policy "public update chains"
  on "public"."puzzle_chains"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "public read regions"
  on "public"."regions"
  as permissive
  for select
  to anon, authenticated
using (true);



