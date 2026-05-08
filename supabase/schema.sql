-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.puzzle_chains (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  region_id uuid,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT puzzle_chains_pkey PRIMARY KEY (id),
  CONSTRAINT puzzle_chains_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id)
);
CREATE TABLE public.puzzle_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chain_id uuid NOT NULL,
  type text NOT NULL,
  content text,
  order_index integer NOT NULL,
  latitude double precision,
  longitude double precision,
  image_url text,
  answer text,
  multiple_choice_options text[],
  hints jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT puzzle_steps_pkey PRIMARY KEY (id),
  CONSTRAINT puzzle_steps_chain_id_fkey FOREIGN KEY (chain_id) REFERENCES public.puzzle_chains(id)
);
CREATE TABLE public.regions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  country text NOT NULL DEFAULT 'philippines'::text,
  CONSTRAINT regions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.treasures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  latitude double precision,
  longitude double precision,
  status text DEFAULT 'active'::text,
  last_found_at timestamp with time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
  CONSTRAINT treasures_pkey PRIMARY KEY (id)
);