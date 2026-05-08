


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."puzzle_chains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "region_id" "uuid",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."puzzle_chains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."puzzle_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chain_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "content" "text",
    "order_index" integer NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "qr_code" "text",
    "answer" "jsonb",
    "hints" "jsonb",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL
);


ALTER TABLE "public"."puzzle_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "country" "text" DEFAULT 'philippines'::"text" NOT NULL
);


ALTER TABLE "public"."regions" OWNER TO "postgres";


COMMENT ON TABLE "public"."regions" IS 'town or island';



CREATE TABLE IF NOT EXISTS "public"."treasures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "chain_id" "uuid",
    "step_index" integer,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "discovered_at" timestamp with time zone,
    "difficulty" integer DEFAULT 1,
    "reward_points" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."treasures" OWNER TO "postgres";


ALTER TABLE ONLY "public"."puzzle_chains"
    ADD CONSTRAINT "puzzle_chains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."puzzle_steps"
    ADD CONSTRAINT "puzzle_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."treasures"
    ADD CONSTRAINT "treasures_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_treasures_location" ON "public"."treasures" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_treasures_status" ON "public"."treasures" USING "btree" ("status");



CREATE INDEX "puzzle_chains_region_id_idx" ON "public"."puzzle_chains" USING "btree" ("region_id");



CREATE INDEX "puzzle_steps_chain_id_idx" ON "public"."puzzle_steps" USING "btree" ("chain_id");



CREATE INDEX "puzzle_steps_chain_id_order_index_idx" ON "public"."puzzle_steps" USING "btree" ("chain_id", "order_index");



CREATE OR REPLACE TRIGGER "trg_update_treasures" BEFORE UPDATE ON "public"."treasures" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."puzzle_chains"
    ADD CONSTRAINT "puzzle_chains_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."puzzle_steps"
    ADD CONSTRAINT "puzzle_steps_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "public"."puzzle_chains"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read chains" ON "public"."puzzle_chains" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow public read steps" ON "public"."puzzle_steps" FOR SELECT TO "anon" USING (true);



CREATE POLICY "allow service role full access" ON "public"."regions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "public read chains" ON "public"."puzzle_chains" FOR SELECT TO "anon" USING (true);



CREATE POLICY "public read steps" ON "public"."puzzle_steps" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."puzzle_chains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."puzzle_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service role full access" ON "public"."regions" USING (true) WITH CHECK (true);



ALTER TABLE "public"."treasures" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."puzzle_chains" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."puzzle_chains" TO "authenticated";
GRANT ALL ON TABLE "public"."puzzle_chains" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."puzzle_steps" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."puzzle_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."puzzle_steps" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."regions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."regions" TO "authenticated";
GRANT ALL ON TABLE "public"."regions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."treasures" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."treasures" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."treasures" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";































drop extension if exists "pg_net";

revoke delete on table "public"."puzzle_chains" from "anon";

revoke insert on table "public"."puzzle_chains" from "anon";

revoke update on table "public"."puzzle_chains" from "anon";

revoke delete on table "public"."puzzle_chains" from "authenticated";

revoke insert on table "public"."puzzle_chains" from "authenticated";

revoke select on table "public"."puzzle_chains" from "authenticated";

revoke update on table "public"."puzzle_chains" from "authenticated";

revoke delete on table "public"."puzzle_steps" from "anon";

revoke insert on table "public"."puzzle_steps" from "anon";

revoke update on table "public"."puzzle_steps" from "anon";

revoke delete on table "public"."puzzle_steps" from "authenticated";

revoke insert on table "public"."puzzle_steps" from "authenticated";

revoke select on table "public"."puzzle_steps" from "authenticated";

revoke update on table "public"."puzzle_steps" from "authenticated";

revoke delete on table "public"."regions" from "anon";

revoke insert on table "public"."regions" from "anon";

revoke select on table "public"."regions" from "anon";

revoke update on table "public"."regions" from "anon";

revoke delete on table "public"."regions" from "authenticated";

revoke insert on table "public"."regions" from "authenticated";

revoke select on table "public"."regions" from "authenticated";

revoke update on table "public"."regions" from "authenticated";

revoke delete on table "public"."treasures" from "anon";

revoke insert on table "public"."treasures" from "anon";

revoke select on table "public"."treasures" from "anon";

revoke update on table "public"."treasures" from "anon";

revoke delete on table "public"."treasures" from "authenticated";

revoke insert on table "public"."treasures" from "authenticated";

revoke select on table "public"."treasures" from "authenticated";

revoke update on table "public"."treasures" from "authenticated";

revoke delete on table "public"."treasures" from "service_role";

revoke insert on table "public"."treasures" from "service_role";

revoke select on table "public"."treasures" from "service_role";

revoke update on table "public"."treasures" from "service_role";


