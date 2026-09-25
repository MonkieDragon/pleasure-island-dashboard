-- Unordered locations: players answer the location's questions in any order.
-- Leading info steps still play first; info steps after a question belong to it.

alter table public.puzzle_chains
  add column if not exists steps_unordered boolean not null default false;

comment on column public.puzzle_chains.steps_unordered is
  'When true, players answer this location''s questions in any order (leading info steps play first; info after a question belongs to it).';
