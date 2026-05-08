-- Enforce multiple-choice shape:
-- - exactly 4 options
-- - answer must be non-empty and one of the options
--
-- Added NOT VALID to avoid breaking if legacy rows exist; validate later once cleaned.

alter table public.puzzle_steps
  add constraint puzzle_steps_multiple_choice_four_options_chk
  check (
    type <> 'multiple_choice'
    or (
      multiple_choice_options is not null
      and array_length(multiple_choice_options, 1) = 4
      and answer is not null
      and btrim(answer) <> ''
      and answer = any(multiple_choice_options)
    )
  )
  not valid;

