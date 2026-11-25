-- Handoff PR 5: one public link per opening (app.mixstro.com/o/<id>), shown only when the poster
-- turns sharing on and picks the clip that may be heard there. Nothing private goes out: no
-- exact location, no messages, no contact details, no other media. Safe to run more than once.

alter table public.board_posts
  add column if not exists shared_at timestamptz,          -- null: not public
  add column if not exists share_clip_id bigint references public.clips (id) on delete set null;

-- The clip must be the poster's own.
create or replace function public.board_post_share_check()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.share_clip_id is not null and not exists (select 1 from public.clips c where c.id = new.share_clip_id and c.profile_id = new.author_id) then
    raise exception 'pick one of your own clips';
  end if;
  return new;
end;
$$;
revoke all on function public.board_post_share_check() from public, anon, authenticated;
drop trigger if exists board_post_share_check on public.board_posts;
create trigger board_post_share_check before insert or update of share_clip_id, author_id on public.board_posts
  for each row execute function public.board_post_share_check();

-- Where a reply came from, so link-driven replies are counted separately from the Board.
alter table public.board_replies add column if not exists source text check (source is null or source in ('board', 'link'));

-- Counts per opening and day: link opens and listens (low-trust, bounded by the server's
-- budgets). Replies are counted from board_replies, which only exist once committed.
create table if not exists public.opening_link_counts (
  post_id bigint not null references public.board_posts (id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('open', 'listen')),
  n integer not null default 0,
  primary key (post_id, day, kind)
);
alter table public.opening_link_counts enable row level security;
revoke all on public.opening_link_counts from anon, authenticated;

create or replace function public.opening_link_count(p_post bigint, p_kind text)
returns void language sql volatile security definer set search_path = public as $$
  insert into public.opening_link_counts (post_id, kind, n)
  select p_post, p_kind, 1 where p_kind in ('open', 'listen') and exists (select 1 from public.board_posts where id = p_post and shared_at is not null)
  on conflict (post_id, day, kind) do update set n = public.opening_link_counts.n + 1;
$$;
revoke all on function public.opening_link_count(bigint, text) from public, anon, authenticated;
grant execute on function public.opening_link_count(bigint, text) to service_role;

-- What anyone with the link sees. A post that isn't shared (or never existed) returns null.
-- A filled, paused or expired opening still returns, with its real status, so the page can say so.
create or replace function public.public_opening(p_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'details', p.details,
    'kind', p.kind,
    'needed_role', p.needed_role,
    'offered_role', p.offered_role,
    'rehearsal_days', p.rehearsal_days,
    'event_date', p.event_date,
    -- Approximate area only: the neighborhood text, never coordinates or an address.
    'area', split_part(coalesce(p.neighborhood, a.neighborhood, ''), ',', 1),
    'status', case when p.status = 'open' and p.expires_at <= now() then 'expired' else p.status end,
    'expires_at', p.expires_at,
    'author', jsonb_build_object('id', a.id, 'first_name', a.first_name, 'username', a.username, 'avatar_url', a.avatar_url,
      'instrument', coalesce(a.main_instrument, a.instruments[1])),
    'band', (select b.name from public.bands b where b.id = p.band_id),
    'clip', (select jsonb_build_object('id', c.id, 'provider', c.provider, 'url', c.url) from public.clips c
             where c.id = p.share_clip_id and c.profile_id = p.author_id)
  )
  from public.board_posts p
  join public.profiles a on a.id = p.author_id and a.onboarded_at is not null
  where p.id = p_id and p.shared_at is not null and p.needed_role is not null;
$$;
revoke all on function public.public_opening(bigint) from public;
grant execute on function public.public_opening(bigint) to anon, authenticated, service_role;

-- Pulse: what the links did.
create or replace function public.opening_link_pulse()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_view_pulse() then return null; end if;
  return jsonb_build_object(
    'shared', (select count(*) from public.board_posts where shared_at is not null and shared_at > now() - interval '28 days'),
    'opens', (select coalesce(sum(n), 0) from public.opening_link_counts where kind = 'open' and day > current_date - 28),
    'listens', (select coalesce(sum(n), 0) from public.opening_link_counts where kind = 'listen' and day > current_date - 28),
    'link_replies', (select count(*) from public.board_replies where source = 'link' and created_at > now() - interval '28 days')
  );
end;
$$;
revoke all on function public.opening_link_pulse() from public, anon;
grant execute on function public.opening_link_pulse() to authenticated;
