-- Sign-up asks "I'm 18 or older" with a checkbox instead of a birthday.
-- Keep birthday for anyone who already gave one, and record when the box was ticked.

alter table public.profiles alter column birthday drop not null;
alter table public.profiles add column adult_confirmed_at timestamptz;
alter table public.profiles add constraint profiles_adult_check
  check (adult_confirmed_at is not null or birthday is not null);
