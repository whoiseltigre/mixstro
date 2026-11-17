-- Product-market fit basics: who came back which day, a few events the other tables
-- can't tell us (sharing), in-app feedback and the 14-day survey, and the private
-- Pulse numbers. Safe to run more than once.

-- When a Connect was accepted (until now we only knew when it was sent) ------------

alter table public.connections add column if not exists accepted_at timestamptz;
update public.connections set accepted_at = created_at where status = 'accepted' and accepted_at is null;

create or replace function public.stamp_connection_accepted()
returns trigger language plpgsql as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    new.accepted_at := coalesce(new.accepted_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists connections_accepted_at on public.connections;
create trigger connections_accepted_at before update of status on public.connections
  for each row execute function public.stamp_connection_accepted();

-- Days each person opened the app (for "came back in week 4") -----------------------

create table if not exists public.active_days (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  primary key (profile_id, day)
);
alter table public.active_days enable row level security;
-- No policies: only the functions below read or write it.

-- The app already calls this when you open it (at most hourly per device).
create or replace function public.touch_last_active()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.profiles set last_active_at = now()
  where id = auth.uid() and last_active_at < now() - interval '1 hour';
  insert into public.active_days (profile_id, day)
  select auth.uid(), current_date
  where exists (select 1 from public.profiles where id = auth.uid())
  on conflict do nothing;
end;
$$;
revoke all on function public.touch_last_active() from public, anon;
grant execute on function public.touch_last_active() to authenticated;

-- A few events no other table records -------------------------------------------------

create table if not exists public.events (
  id bigint generated always as identity primary key,
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (name in ('shared_profile', 'get_started_opened', 'get_started_dismissed')),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) < 2000),
  created_at timestamptz not null default now()
);
create index if not exists events_name_idx on public.events (name, created_at);
alter table public.events enable row level security;
drop policy if exists "log own events" on public.events;
create policy "log own events" on public.events for insert to authenticated with check (profile_id = auth.uid());

-- Feedback and the "How would you feel if you could no longer use Mixstro?" survey ---

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('note', 'pmf_survey')),
  disappointment text check (disappointment in ('very', 'somewhat', 'not')),
  instead text check (instead is null or char_length(instead) <= 280),
  body text check (body is null or char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  check (kind <> 'pmf_survey' or disappointment is not null),
  check (kind <> 'note' or body is not null)
);
create unique index if not exists feedback_one_survey on public.feedback (profile_id) where kind = 'pmf_survey';
alter table public.feedback enable row level security;
drop policy if exists "send own feedback" on public.feedback;
create policy "send own feedback" on public.feedback for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "read own feedback" on public.feedback;
create policy "read own feedback" on public.feedback for select to authenticated using (profile_id = auth.uid());

-- Who can see Pulse, and accounts left out of the numbers ----------------------------

create table if not exists public.pulse_viewers (
  profile_id uuid primary key references public.profiles (id) on delete cascade
);
create table if not exists public.metrics_excluded (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  note text
);
alter table public.pulse_viewers enable row level security;
alter table public.metrics_excluded enable row level security;
-- No policies: add rows from the SQL editor.

-- The Pulse numbers ------------------------------------------------------------------
-- Signup cohorts by week for the last 10 weeks, plus replies, jams, sharing and the
-- survey. Only people listed in pulse_viewers get anything back.

create or replace function public.pmf_pulse()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.pulse_viewers where profile_id = auth.uid()) then
    return null;
  end if;

  with
  excluded as (
    select profile_id from public.metrics_excluded
    union select profile_id from public.pulse_viewers
  ),
  people as (
    select p.* from public.profiles p where p.id not in (select profile_id from excluded)
  ),
  cohort as (
    select
      p.id,
      date_trunc('week', p.created_at)::date as week,
      p.created_at,
      p.onboarded_at is not null as finished,
      exists (
        select 1 from public.connections c
        where c.from_id = p.id and c.status <> 'passed' and c.created_at < p.created_at + interval '7 days'
      ) or exists (
        select 1 from public.messages m
        where m.sender_id = p.id and m.created_at < p.created_at + interval '7 days'
      ) or exists (
        select 1 from public.board_posts b
        where b.author_id = p.id and b.created_at < p.created_at + interval '7 days'
      ) or exists (
        select 1 from public.board_replies r
        where r.from_id = p.id and r.created_at < p.created_at + interval '7 days'
      ) as acted,
      exists (
        select 1 from public.connections c
        where (c.from_id = p.id or c.to_id = p.id) and c.status = 'accepted'
          and coalesce(c.accepted_at, c.created_at) < p.created_at + interval '7 days'
      ) as connected,
      exists (
        select 1 from public.active_days a
        where a.profile_id = p.id and a.day between (p.created_at::date + 21) and (p.created_at::date + 27)
      ) as week4,
      p.created_at < now() - interval '28 days' as week4_known,
      p.created_at < now() - interval '7 days' as week1_known,
      exists (select 1 from public.events e where e.profile_id = p.id and e.name = 'shared_profile') as shared,
      (select count(*) from people q where q.invited_by = p.id) as brought
    from people p
    where p.created_at > date_trunc('week', now()) - interval '9 weeks'
  ),
  cohorts as (
    select
      week,
      count(*) as signups,
      count(*) filter (where finished) as finished,
      count(*) filter (where finished and acted) as activated,
      count(*) filter (where connected) as connected,
      bool_and(week1_known) as week1_known,
      count(*) filter (where week4) as week4,
      bool_and(week4_known) as week4_known,
      count(*) filter (where shared) as sharers,
      coalesce(sum(brought), 0) as brought
    from cohort group by week
  ),
  -- First message in each conversation, and whether the other person answered within 48 hours.
  firsts as (
    select distinct on (m.connection_id)
      m.connection_id, m.sender_id, m.created_at, c.from_id, c.to_id
    from public.messages m
    join public.connections c on c.id = m.connection_id
    where c.from_id not in (select profile_id from excluded) and c.to_id not in (select profile_id from excluded)
    order by m.connection_id, m.created_at
  ),
  convos as (
    select
      date_trunc('week', f.created_at)::date as week,
      f.created_at < now() - interval '48 hours' as known,
      exists (
        select 1 from public.messages r
        where r.connection_id = f.connection_id and r.sender_id <> f.sender_id
          and r.created_at <= f.created_at + interval '48 hours'
      ) as replied
    from firsts f
    where f.created_at > date_trunc('week', now()) - interval '9 weeks'
  ),
  replies as (
    select week, count(*) filter (where known) as started, count(*) filter (where known and replied) as replied
    from convos group by week
  ),
  played as (
    select date_trunc('week', ch.created_at)::date as week, count(distinct ch.jam_id) as jams
    from public.jam_checkins ch
    where ch.played and ch.profile_id not in (select profile_id from excluded)
      and ch.created_at > date_trunc('week', now()) - interval '9 weeks'
    group by 1
  ),
  survey as (
    select f.* from public.feedback f
    where f.kind = 'pmf_survey' and f.profile_id not in (select profile_id from excluded)
  )
  select jsonb_build_object(
    'generated_at', now(),
    'cohorts', coalesce((select jsonb_agg(to_jsonb(c) order by c.week desc) from cohorts c), '[]'::jsonb),
    'replies', coalesce((select jsonb_agg(to_jsonb(r) order by r.week desc) from replies r), '[]'::jsonb),
    'played', coalesce((select jsonb_agg(to_jsonb(p) order by p.week desc) from played p), '[]'::jsonb),
    'active_30d', (select count(distinct a.profile_id) from public.active_days a
                   where a.day > current_date - 30 and a.profile_id not in (select profile_id from excluded)),
    'played_30d', (select count(distinct ch.jam_id) from public.jam_checkins ch
                   where ch.played and ch.created_at > now() - interval '30 days'
                     and ch.profile_id not in (select profile_id from excluded)),
    'real_people', (select count(*) from people where onboarded_at is not null),
    'survey', jsonb_build_object(
      'answers', (select count(*) from survey),
      'very', (select count(*) from survey where disappointment = 'very'),
      'somewhat', (select count(*) from survey where disappointment = 'somewhat'),
      'not', (select count(*) from survey where disappointment = 'not'),
      'instead', coalesce((select jsonb_agg(jsonb_build_object('text', s.instead, 'at', s.created_at, 'answer', s.disappointment) order by s.created_at desc)
                           from (select * from survey where instead is not null order by created_at desc limit 30) s), '[]'::jsonb)
    ),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('body', n.body, 'at', n.created_at, 'username', n.username) order by n.created_at desc)
      from (
        select f.body, f.created_at, p.username::text as username
        from public.feedback f join public.profiles p on p.id = f.profile_id
        where f.kind = 'note' order by f.created_at desc limit 30
      ) n
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
revoke all on function public.pmf_pulse() from public, anon;
grant execute on function public.pmf_pulse() to authenticated;

-- Is the 14-day survey due for me? (Signed up 14+ days ago, finished signup, not answered.)
create or replace function public.pmf_survey_due()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.onboarded_at is not null
      and p.created_at < now() - interval '14 days'
      and not exists (select 1 from public.feedback f where f.profile_id = p.id and f.kind = 'pmf_survey')
  );
$$;
revoke all on function public.pmf_survey_due() from public, anon;
grant execute on function public.pmf_survey_due() to authenticated;

-- Am I a Pulse viewer? (Lets Settings show the link.)
create or replace function public.can_view_pulse()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pulse_viewers where profile_id = auth.uid());
$$;
revoke all on function public.can_view_pulse() from public, anon;
grant execute on function public.can_view_pulse() to authenticated;
