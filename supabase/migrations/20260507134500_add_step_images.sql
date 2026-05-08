-- Add step images metadata (stored in Supabase Storage; metadata in jsonb).
-- Safe to run even if column already exists.

alter table public.puzzle_steps
  add column if not exists images jsonb;

