-- Remove title (optional naming moved to description); drop unused gameplay columns.
alter table public.treasures drop column if exists title;
alter table public.treasures drop column if exists step_index;
alter table public.treasures drop column if exists difficulty;
alter table public.treasures drop column if exists reward_points;
