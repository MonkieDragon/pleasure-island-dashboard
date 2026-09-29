-- Structured answers for multi-question prompts (e.g. end-of-trail "would you do another?").
alter table public.player_feedback
  add column if not exists answers jsonb;
