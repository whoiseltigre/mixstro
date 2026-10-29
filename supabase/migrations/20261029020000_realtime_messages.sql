-- Stream new chat messages to the two people in a conversation.
-- Realtime applies the existing "read messages" RLS policy, so only members of an
-- accepted connection receive inserts for it.
alter publication supabase_realtime add table public.messages;
