-- Alternative accepted answers for free-form step matching (text / number / some interactive).
alter table public.puzzle_steps
  add column if not exists alternative_answers text[] not null default '{}';
