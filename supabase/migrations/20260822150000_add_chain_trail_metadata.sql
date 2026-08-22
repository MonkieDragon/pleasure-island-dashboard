ALTER TABLE public.puzzle_chains
  ADD COLUMN description text,
  ADD COLUMN duration_minutes integer,
  ADD COLUMN distance_km numeric,
  ADD COLUMN transport_mode text,
  ADD COLUMN is_free boolean NOT NULL DEFAULT true;
