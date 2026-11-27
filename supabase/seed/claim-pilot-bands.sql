-- Claim pilot: the 14 bands (2,500 Deezer fans or less), lineups from MusicBrainz.
-- Run AFTER supabase/migrations/20261127000000_claim_pilot.sql. Safe to run twice: a band that
-- already exists with the same MusicBrainz id is skipped.
-- Pillow Queens has no Instagram link (MusicBrainz's is broken); Taylor checks it at DM time.
do $$
declare b bigint;
begin
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '63996a02-ddd2-4b7b-acca-760ae7387d4f') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('THE WLDLFE', 'Indianapolis, IN', array['pop rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "63996a02-ddd2-4b7b-acca-760ae7387d4f", "deezer_id": 9967698, "first_year": 2016}'::jsonb, 'https://www.instagram.com/the_wldlfe/', 'https://www.thewldlfe.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Carson Hogan', 'vocals, guitar', 0),
      (b, 'Jansen Hogan', 'vocals, guitar', 1),
      (b, 'Jack Crane', 'bass', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'efde08b3-d2db-44e8-b2a7-10fc7bcc3604') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('FACS', 'Chicago, IL', array['post-punk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "efde08b3-d2db-44e8-b2a7-10fc7bcc3604", "deezer_id": 1683422, "first_year": 2017}'::jsonb, 'https://www.instagram.com/wearefacs/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Brian Case', null, 0),
      (b, 'Noah Leger', 'drums', 1),
      (b, 'Alianna Kalaba', 'bass', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '6791ea2c-0af1-418b-8155-076ac7cfe899') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Justice For The Damned', 'Sydney, Australia', array['hardcore']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "6791ea2c-0af1-418b-8155-076ac7cfe899", "deezer_id": 11141462, "first_year": 2016}'::jsonb, 'https://www.instagram.com/justiceforthegram/', 'https://justiceforthedamned.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Bobak Rafiee', null, 0),
      (b, 'Nick Adams', null, 1),
      (b, 'Zak Thom', 'guitar', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'ed84e235-0dd9-41c8-b9be-1e5cfc1198c4') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Remember Sports', 'Philadelphia, PA', array['indie rock','indie pop']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "ed84e235-0dd9-41c8-b9be-1e5cfc1198c4", "deezer_id": 13532685, "first_year": 2015}'::jsonb, 'https://www.instagram.com/remembersportsband/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Carmen Perry', null, 0),
      (b, 'Catherine Dwyer', null, 1),
      (b, 'Connor Perry', null, 2),
      (b, 'Jack Washburn', null, 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '1c1dbb2e-266b-45b6-9e72-a7d34725035b') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Yuuf', 'London, UK', array['psychedelic']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "1c1dbb2e-266b-45b6-9e72-a7d34725035b", "deezer_id": 164142997, "first_year": 2022}'::jsonb, 'https://www.instagram.com/yuuf.official/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Hugo Cottu', 'guitar', 0),
      (b, 'Anthony Boatright', 'bass', 1),
      (b, 'Oliver Overgaard', 'drums', 2),
      (b, 'Andrin Haag', 'percussion, handpan', 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '924b5ed3-d283-46af-ad59-406bdbe0a1a1') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Mipso', 'Chapel Hill, NC', array['americana','folk','bluegrass']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "924b5ed3-d283-46af-ad59-406bdbe0a1a1", "deezer_id": 5269973, "first_year": 2013}'::jsonb, 'https://www.instagram.com/mipsomusic/', 'https://mipsomusic.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Jacob Sharp', null, 0),
      (b, 'Joseph Terrell', null, 1),
      (b, 'Libby Rodenbough', 'fiddle', 2),
      (b, 'Wood Robinson', null, 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'cae1f90c-53f9-442c-a284-3b638ecdb653') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Winnetka Bowling League', 'Los Angeles, CA', array['indie pop']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "cae1f90c-53f9-442c-a284-3b638ecdb653", "deezer_id": 49620112, "first_year": 2018}'::jsonb, null, 'http://www.wbleague.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Matthew Koma', null, 0),
      (b, 'Kris Mazzarisi', null, 1),
      (b, 'Blake Straus', null, 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '4c33904b-1c93-4f63-bb23-69d3544eaf77') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Pom Pom Squad', 'Brooklyn, NY', array['indie rock','punk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "4c33904b-1c93-4f63-bb23-69d3544eaf77", "deezer_id": 55897292, "first_year": 2018}'::jsonb, 'https://www.instagram.com/pompomsquad/', 'https://www.pompomsquadband.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Mia Berrin', 'vocals, guitar', 0),
      (b, 'Mari Alé Figeman', 'bass', 1),
      (b, 'Shelby Keller', 'drums', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '3329e0ce-14b6-4b51-b658-85f6392554a3') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Pillow Queens', 'Dublin, Ireland', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "3329e0ce-14b6-4b51-b658-85f6392554a3", "deezer_id": 1258570, "first_year": 2016}'::jsonb, null, 'https://pillowqueens.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Pamela Connolly', null, 0),
      (b, 'Sarah Corcoran', null, 1),
      (b, 'Rachel Lyons', null, 2),
      (b, 'Cathy McGuinness', null, 3),
      (b, 'Duncan Malashock', null, 4);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'dd682352-d506-4d75-90cc-ff8daa0af05a') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Dina Ögon', 'Stockholm, Sweden', array['indie pop','jazz']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "dd682352-d506-4d75-90cc-ff8daa0af05a", "deezer_id": 130705932, "first_year": 2021}'::jsonb, 'https://www.instagram.com/dinaogon/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Anna Ahnlund', null, 0),
      (b, 'Daniel Ögren', null, 1),
      (b, 'Christopher Cantillo', null, 2),
      (b, 'Love Örsan', null, 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'db44f6a6-26d2-423f-8514-da4cfa7412a6') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Jamestown Revival', 'Austin, TX', array['americana','folk rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "db44f6a6-26d2-423f-8514-da4cfa7412a6", "deezer_id": 1092152, "first_year": 2014}'::jsonb, 'https://www.instagram.com/jamestownrevival/', 'https://www.jamestownrevival.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Jonathan Clay', null, 0),
      (b, 'Zach Chance', null, 1),
      (b, 'Nick Bearden', null, 2),
      (b, 'Ed Benrock', null, 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '6afac4cd-5ac3-461b-be39-855602eb1c6b') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Pile', 'Boston, MA', array['post-hardcore','indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "6afac4cd-5ac3-461b-be39-855602eb1c6b", "deezer_id": 412119, "first_year": 2009}'::jsonb, 'https://www.instagram.com/pilemusic/', 'https://pilemusic.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Rick Maguire', 'vocals, guitar', 0),
      (b, 'Matt Becker', 'guitar', 1),
      (b, 'Matt Connery', 'bass', 2),
      (b, 'Kris Kuss', 'drums', 3),
      (b, 'Chappy Hull', null, 4),
      (b, 'Alex Molini', null, 5);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '250c38d6-0353-4c22-a371-f305d908573c') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Starflyer 59', 'Riverside, CA', array['alternative rock','shoegaze']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "250c38d6-0353-4c22-a371-f305d908573c", "deezer_id": 9068, "first_year": 1994}'::jsonb, 'https://www.instagram.com/sf59/', 'http://www.sf59.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Jason Martin', 'vocals, guitar', 0),
      (b, 'Steven Dail', 'bass', 1),
      (b, 'Joey Esquibel', 'drums', 2),
      (b, 'Charlie Martin', 'drums', 3),
      (b, 'Trey Many', null, 4);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'ada86294-d23d-4e54-a764-570d090f0d8e') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Flatland Cavalry', 'Lubbock, TX', array['country']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "ada86294-d23d-4e54-a764-570d090f0d8e", "deezer_id": 7954262, "first_year": 2015}'::jsonb, 'https://www.instagram.com/flatlandcavalry/', 'https://www.flatlandcavalry.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Cleto Cordero', null, 0),
      (b, 'Jason Albers', null, 1),
      (b, 'Reid Dillon', null, 2),
      (b, 'Jonathan Saenz', null, 3),
      (b, 'Wesley Hall', 'fiddle', 4),
      (b, 'Adam Gallegos', null, 5);
  end if;
end $$;

-- Their page links, for the DMs:
select name, 'https://app.mixstro.com/b/' || id as page from public.bands where claim_state = 'unclaimed' order by id;
