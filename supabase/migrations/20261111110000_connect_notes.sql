-- Every new Connect carries a short note. When the other person says yes, the note
-- becomes the first message in your chat, so the conversation starts with it.
-- Safe to run more than once.

alter table public.connections add column if not exists note text
  check (note is null or char_length(note) between 1 and 280);

create or replace function public.connection_note_to_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' and new.note is not null
     and not exists (select 1 from public.messages m where m.connection_id = new.id) then
    insert into public.messages (connection_id, sender_id, body, created_at)
    values (new.id, new.from_id, new.note, new.created_at);
  end if;
  return new;
end;
$$;

drop trigger if exists connections_note_to_chat on public.connections;
create trigger connections_note_to_chat after update of status on public.connections
  for each row execute function public.connection_note_to_chat();
