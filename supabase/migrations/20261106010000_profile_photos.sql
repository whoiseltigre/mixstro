-- Profile photos. Public bucket (profiles are meant to be seen, and the share loop needs
-- photos in link previews), one folder per person: avatars/<profile id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "upload own photo" on storage.objects;
create policy "upload own photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "replace own photo" on storage.objects;
create policy "replace own photo" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own photo" on storage.objects;
create policy "delete own photo" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
