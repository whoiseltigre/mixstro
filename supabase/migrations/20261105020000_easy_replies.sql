-- #3 Easy replies: "Not the right fit" (or Pass on a Connect someone sent you) closes the
-- Connect as 'declined', so the sender can be told kindly. 'passed' stays for passing on
-- someone who never asked. Pending Connects older than 7 days are hidden by the app.
alter table public.connections drop constraint if exists connections_status_check;
alter table public.connections add constraint connections_status_check
  check (status in ('pending', 'accepted', 'passed', 'declined'));
