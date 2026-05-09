-- Enforce treasure status to a fixed set of values.
-- Also normalizes any existing unexpected values to 'available'.

alter table public.treasures
  drop constraint if exists treasures_status_valid;

update public.treasures
set status = 'available'
where status is null
   or status not in ('available', 'assigned', 'discovered');

alter table public.treasures
  alter column status set default 'available';

alter table public.treasures
  add constraint treasures_status_valid
  check (status in ('available', 'assigned', 'discovered'));

