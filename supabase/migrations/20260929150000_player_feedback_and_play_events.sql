-- Web test build: anonymous players, in-app feedback, and play events.

-- ---------------------------------------------------------------------------
-- 1) Anonymous sign-ins become players, not editors
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, email)
  values (
    new.id,
    case when coalesce(new.is_anonymous, false) then 'player' else 'editor' end,
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) player_feedback
-- ---------------------------------------------------------------------------
create table if not exists public.player_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete cascade,
  trail_id uuid references public.trails (id) on delete set null,
  chain_id uuid references public.puzzle_chains (id) on delete set null,
  step_id uuid references public.puzzle_steps (id) on delete set null,
  kind text not null
    constraint player_feedback_kind_chk
    check (kind in ('problem', 'suggestion', 'rating', 'new_location')),
  rating smallint
    constraint player_feedback_rating_chk check (rating between 1 and 5),
  message text
    constraint player_feedback_message_len_chk check (char_length(message) <= 4000),
  latitude double precision,
  longitude double precision,
  app_version text,
  status text not null default 'new'
    constraint player_feedback_status_chk check (status in ('new', 'seen', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists player_feedback_status_created_idx
  on public.player_feedback (status, created_at desc);
create index if not exists player_feedback_region_idx
  on public.player_feedback (region_id);

grant select, insert on table public.player_feedback to authenticated;
grant update (status) on table public.player_feedback to authenticated;

alter table public.player_feedback enable row level security;

create policy "Players insert own feedback"
  on public.player_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Staff read feedback"
  on public.player_feedback
  for select
  to authenticated
  using (public.can_staff_edit_region(region_id));

create policy "Staff update feedback status"
  on public.player_feedback
  for update
  to authenticated
  using (public.can_staff_edit_region(region_id))
  with check (public.can_staff_edit_region(region_id));

-- ---------------------------------------------------------------------------
-- 3) play_events
-- ---------------------------------------------------------------------------
create table if not exists public.play_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete cascade,
  event text not null
    constraint play_events_event_chk
    check (event in (
      'trail_started',
      'step_viewed',
      'answer_wrong',
      'hint_used',
      'location_completed',
      'trail_completed',
      'explore_opened'
    )),
  trail_id uuid references public.trails (id) on delete set null,
  chain_id uuid references public.puzzle_chains (id) on delete set null,
  step_id uuid references public.puzzle_steps (id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists play_events_trail_created_idx
  on public.play_events (trail_id, created_at);
create index if not exists play_events_region_idx
  on public.play_events (region_id);

grant select, insert on table public.play_events to authenticated;

alter table public.play_events enable row level security;

create policy "Players insert own events"
  on public.play_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Staff read events"
  on public.play_events
  for select
  to authenticated
  using (public.can_staff_edit_region(region_id));
