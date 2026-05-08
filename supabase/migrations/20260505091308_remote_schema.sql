alter table "public"."treasures" drop column "chain_id";

alter table "public"."treasures" add column "region_id" uuid;

alter table "public"."treasures" add constraint "treasures_region_id_fkey" FOREIGN KEY (region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."treasures" validate constraint "treasures_region_id_fkey";


