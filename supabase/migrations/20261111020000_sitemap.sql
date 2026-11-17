-- Get found on Google: the public music pages and band pages to list in the sitemap.
-- Only people whose page is public (Settings > Your page) and who finished signup, and
-- only bands with at least one such member. Returns nothing else.
create or replace function public.sitemap_entries()
returns table (kind text, key text)
language sql stable security definer set search_path = public as $$
  select 'profile', p.username::text
  from public.profiles p
  where p.public_page and p.onboarded_at is not null
  union all
  select 'band', b.id::text
  from public.bands b
  where exists (
    select 1 from public.band_members bm join public.profiles p on p.id = bm.profile_id
    where bm.band_id = b.id and p.public_page and p.onboarded_at is not null
  )
  limit 45000;
$$;
revoke all on function public.sitemap_entries() from public;
grant execute on function public.sitemap_entries() to anon, authenticated;
