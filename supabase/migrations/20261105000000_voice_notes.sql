-- Voice notes in chat. Recordings go to a PRIVATE "voice" bucket at
-- <connection id>/<sender id>/<file>. Only the two people in an accepted connection
-- can upload to or play from that connection's folder; the app plays them through
-- short-lived signed links.

alter table public.messages add column if not exists voice_seconds smallint
  check (voice_seconds is null or voice_seconds between 1 and 120);

-- A voice note must point inside its own conversation's folder, under its sender.
alter table public.messages drop constraint if exists messages_voice_path;
alter table public.messages add constraint messages_voice_path
  check (voice_url is null or voice_url like (connection_id::text || '/' || sender_id::text || '/%')) not valid;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 3145728, array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac'])
on conflict (id) do nothing;

drop policy if exists "send voice notes" on storage.objects;
create policy "send voice notes" on storage.objects for insert to authenticated with check (
  bucket_id = 'voice'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.connections c
    where c.id::text = (storage.foldername(name))[1] and c.status = 'accepted' and auth.uid() in (c.from_id, c.to_id)
  )
);

drop policy if exists "hear voice notes" on storage.objects;
create policy "hear voice notes" on storage.objects for select to authenticated using (
  bucket_id = 'voice'
  and exists (
    select 1 from public.connections c
    where c.id::text = (storage.foldername(name))[1] and c.status = 'accepted' and auth.uid() in (c.from_id, c.to_id)
  )
);

drop policy if exists "delete own voice notes" on storage.objects;
create policy "delete own voice notes" on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[2] = auth.uid()::text);
