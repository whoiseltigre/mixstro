-- The Board: bands, sessions and collabs post open spots; musicians answer with their profile.

alter table public.board_posts
  add column if not exists role text,          -- who they need: "Drummer", "Lead singer"
  add column if not exists pay text,           -- "$300/day", shown when paid
  add column if not exists closed_at timestamptz;

alter table public.board_posts drop constraint if exists board_posts_lengths;
alter table public.board_posts add constraint board_posts_lengths check (
  char_length(title) between 3 and 80
  and (details is null or char_length(details) <= 1000)
  and (role is null or char_length(role) <= 60)
  and (pay is null or char_length(pay) <= 40)
  and (neighborhood is null or char_length(neighborhood) <= 80)
);

create index if not exists board_posts_open_idx on public.board_posts (created_at desc) where closed_at is null;

-- An answer: "here's my profile", plus an optional short note. One per person per post.
create table if not exists public.board_replies (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.board_posts (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  unique (post_id, from_id)
);
create index if not exists board_replies_post_idx on public.board_replies (post_id, created_at);

alter table public.board_replies enable row level security;

-- You see your own answers, and the answers to your posts.
drop policy if exists "read board replies" on public.board_replies;
create policy "read board replies" on public.board_replies for select to authenticated using (
  from_id = auth.uid()
  or exists (select 1 from public.board_posts p where p.id = post_id and p.author_id = auth.uid())
);

-- You can answer open posts that aren't yours, as yourself.
drop policy if exists "answer board posts" on public.board_replies;
create policy "answer board posts" on public.board_replies for insert to authenticated with check (
  from_id = auth.uid()
  and exists (
    select 1 from public.board_posts p
    where p.id = post_id and p.author_id <> auth.uid() and p.closed_at is null
      and not public.is_blocked(auth.uid(), p.author_id)
  )
);

drop policy if exists "take back answer" on public.board_replies;
create policy "take back answer" on public.board_replies for delete to authenticated using (from_id = auth.uid());

-- How many people answered each of your posts (only the author gets counts).
create or replace function public.my_board_reply_counts()
returns table (post_id bigint, replies integer)
language sql
stable
security invoker
set search_path = public
as $$
  select r.post_id, count(*)::integer
  from public.board_replies r
  join public.board_posts p on p.id = r.post_id
  where p.author_id = auth.uid()
  group by r.post_id;
$$;
grant execute on function public.my_board_reply_counts() to authenticated;
