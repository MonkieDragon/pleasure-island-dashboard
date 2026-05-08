-- Adds admin-only notes to steps and optional media/notes to treasures.
-- Safe to run even if columns already exist.

alter table public.puzzle_steps
  add column if not exists notes text;

alter table public.treasures
  add column if not exists image_url text;

alter table public.treasures
  add column if not exists notes text;

