-- Mixstro initial schema: profiles from onboarding, influences, clips,
-- connections between musicians, messages, and Board posts.

create extension if not exists citext;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  username citext not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  birthday date not null check (birthday <= (current_date - interval '18 years')),
  avatar_url text,
  instruments text[] not null default '{}',
  main_instrument text,
  level text check (level in ('learning', 'solid', 'pro')),
  genres text[] not null default '{}',
  music_source text check (music_source in ('apple_music', 'spotify', 'manual')),
  goals text[] not null default '{}',
  commitment smallint not null default 1 check (commitment between 0 and 3),
  neighborhood text,
  radius_mi smallint not null default 25 check (radius_mi between 1 and 500),
  play_days text[] not null default '{}',
  bio text,
  onboarded_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.influences (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  artist_id text not null,
  artist_name text not null,
  image_url text,
  source text not null default 'manual',
  rank smallint not null default 0,
  unique (profile_id, artist_id)
);
create index influences_artist_idx on public.influences (artist_id);

create table public.clips (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('clip', 'band')),
  provider text check (provider in ('youtube', 'tiktok')),
  url text not null, -- clip: the pasted YouTube/TikTok link; band: the band name
  created_at timestamptz not null default now()
);

-- A connection request from one musician to another. Both must say yes before messaging opens.
create table public.connections (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'passed')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

create table public.messages (
  id bigint generated always as identity primary key,
  connection_id bigint not null references public.connections (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  voice_url text,
  created_at timestamptz not null default now(),
  check (body is not null or voice_url is not null)
);
create index messages_connection_idx on public.messages (connection_id, created_at);

create table public.board_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('band_seeking', 'session', 'collab')),
  title text not null,
  details text,
  neighborhood text,
  paid boolean not null default false,
  closes_on date,
  created_at timestamptz not null default now()
);

-- Row level security ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.influences enable row level security;
alter table public.clips enable row level security;
alter table public.connections enable row level security;
alter table public.messages enable row level security;
alter table public.board_posts enable row level security;

-- Profiles: signed-in users can read finished profiles and their own; write only their own.
create policy "read profiles" on public.profiles for select to authenticated
  using (onboarded_at is not null or id = auth.uid());
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "read influences" on public.influences for select to authenticated using (true);
create policy "manage own influences" on public.influences for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "read clips" on public.clips for select to authenticated using (true);
create policy "manage own clips" on public.clips for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Connections: only the two people involved can see one.
create policy "see own connections" on public.connections for select to authenticated
  using (auth.uid() in (from_id, to_id));
create policy "send connection" on public.connections for insert to authenticated with check (from_id = auth.uid());
create policy "answer connection" on public.connections for update to authenticated using (to_id = auth.uid());

-- Messages: only within an accepted connection you belong to.
create policy "read messages" on public.messages for select to authenticated using (
  exists (select 1 from public.connections c
          where c.id = connection_id and c.status = 'accepted' and auth.uid() in (c.from_id, c.to_id))
);
create policy "send messages" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.connections c
    where c.id = connection_id and c.status = 'accepted' and auth.uid() in (c.from_id, c.to_id))
);

create policy "read board" on public.board_posts for select to authenticated using (true);
create policy "manage own posts" on public.board_posts for all to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
