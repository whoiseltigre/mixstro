-- Handoff PR 6: clip replies. A message can point at a clip (yours or theirs) and, optionally,
-- a moment in it ("at 1:23"), with or without text. Safe to run more than once, and compatible
-- with the app that's live now: both columns are optional and older messages are unchanged.

-- 1) How long a clip is, when we know it. Timestamps are bounded by it.
alter table public.clips add column if not exists duration_s integer check (duration_s is null or duration_s between 1 and 21600);

-- 2) The reference. No foreign key on purpose: when a clip is removed, the message stays
-- (still readable) and the app shows "no longer available" instead of dropping the reply.
alter table public.messages add column if not exists clip_id bigint;
alter table public.messages add column if not exists clip_at integer;

-- A message needs text, a voice note or a clip. Replaces the original "text or voice" rule.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.messages'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%voice_url is not null%' and conname <> 'messages_has_content'
  loop
    execute format('alter table public.messages drop constraint %I', c);
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'public.messages'::regclass and conname = 'messages_has_content') then
    alter table public.messages add constraint messages_has_content check (body is not null or voice_url is not null or clip_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.messages'::regclass and conname = 'messages_clip_at_check') then
    alter table public.messages add constraint messages_clip_at_check check (clip_at is null or (clip_id is not null and clip_at between 0 and 21600));
  end if;
end $$;

-- 3) Only clips that belong to someone in the conversation, only recorded or linked clips (not
-- band names), and only moments inside the clip when its length is known. Checked when the
-- message is written; a clip removed later just shows as unavailable.
create or replace function public.message_clip_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
  len integer;
begin
  if new.clip_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.clip_id is not distinct from old.clip_id and new.clip_at is not distinct from old.clip_at then return new; end if;
  select c.profile_id, c.duration_s into owner, len from public.clips c where c.id = new.clip_id and c.kind = 'clip';
  if owner is null or not exists (
    select 1 from public.connections k
    where k.id = new.connection_id and owner in (k.from_id, k.to_id)
  ) then
    raise exception 'that clip is not available here' using errcode = '23514';
  end if;
  if new.clip_at is not null and len is not null and new.clip_at > len then
    raise exception 'that moment is past the end of the clip' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.message_clip_check() from public, anon, authenticated;
drop trigger if exists messages_clip_check on public.messages;
create trigger messages_clip_check before insert or update of clip_id, clip_at on public.messages
  for each row execute function public.message_clip_check();

-- The inbox needs no change: latest_messages returns body and voice_url, and a message with
-- neither is, by the rule above, a clip reply.
