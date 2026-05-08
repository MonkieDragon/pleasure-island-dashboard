-- Ensure `puzzle_steps.answer` is always a single plain string.
-- If an existing answer was converted into a JSON object string (e.g. {"key":"value"}),
-- flatten it by taking the first object's value and discarding the key.
--
-- NOTE: This only runs for rows whose `answer` text parses as JSON and is an object.

with parsed as (
  select
    id,
    answer::jsonb as j
  from public.puzzle_steps
  where answer is not null
    and answer ~ '^\s*\{'
),
first_kv as (
  select
    p.id,
    (select value from jsonb_each(p.j) limit 1) as v
  from parsed p
  where jsonb_typeof(p.j) = 'object'
)
update public.puzzle_steps s
set answer =
  case
    when fk.v is null then s.answer
    when jsonb_typeof(fk.v) = 'string' then fk.v #>> '{}'
    when jsonb_typeof(fk.v) in ('number', 'boolean') then fk.v::text
    when jsonb_typeof(fk.v) = 'array' then
      case
        when jsonb_array_length(fk.v) = 0 then null
        when jsonb_typeof(fk.v->0) = 'string' then fk.v->>0
        else (fk.v->0)::text
      end
    else fk.v::text
  end
from first_kv fk
where s.id = fk.id;

