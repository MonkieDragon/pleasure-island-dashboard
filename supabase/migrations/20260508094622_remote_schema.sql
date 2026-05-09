revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

alter table "public"."treasures" drop constraint "treasures_status_valid";

alter table "public"."regions" add column "image_url" text;


  create policy "public read treasures"
  on "public"."treasures"
  as permissive
  for select
  to anon, authenticated
using (true);



