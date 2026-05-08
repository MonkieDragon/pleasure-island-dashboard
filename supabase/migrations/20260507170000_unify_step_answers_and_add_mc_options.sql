-- Unify step answers:
-- - `answer` becomes TEXT for all step types (including QR + number)
-- - remove separate `qr_code` column
-- - add `multiple_choice_options` (TEXT[]) for multiple-choice steps

alter table public.puzzle_steps
  add column if not exists multiple_choice_options text[];

-- Best-effort: preserve existing QR payloads by copying qr_code -> answer
-- before we convert answer's type.
update public.puzzle_steps
set answer = to_jsonb(qr_code)
where type = 'qr'
  and qr_code is not null
  and (answer is null or answer = 'null'::jsonb);

-- Convert `answer` jsonb -> text:
-- - string: store raw string value (unquoted)
-- - number/bool: store textual value
-- - array: store first element (string or textual)
-- - object/other: store JSON string
alter table public.puzzle_steps
  alter column answer type text
  using (
    case
      when answer is null then null
      when jsonb_typeof(answer) = 'string' then answer #>> '{}'
      when jsonb_typeof(answer) in ('number', 'boolean') then answer::text
      when jsonb_typeof(answer) = 'array' then
        case
          when jsonb_array_length(answer) = 0 then null
          when jsonb_typeof(answer->0) = 'string' then answer->>0
          else (answer->0)::text
        end
      else answer::text
    end
  );

alter table public.puzzle_steps
  drop column if exists qr_code;

