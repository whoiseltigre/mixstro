-- Claim pilot: the pilot bands (2,500 Deezer fans or less), lineups from MusicBrainz.
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
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '2c02eece-9832-4850-9150-b0e269f65d8b') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Middle Kids', 'Sydney, Australia', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "2c02eece-9832-4850-9150-b0e269f65d8b", "deezer_id": 11551583, "first_year": 2015}'::jsonb, 'https://www.instagram.com/middlekidsmusic/', 'https://www.middlekidsmusic.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Hannah Joy', 'keys, guitar, vocals', 0),
      (b, 'Tim Fitz', 'bass', 1),
      (b, 'Harry Day', 'drums', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '3f194516-6f0d-4d26-b631-71117f3bc41d') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('The Wrecks', 'Thousand Oaks, CA', array['pop rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "3f194516-6f0d-4d26-b631-71117f3bc41d", "deezer_id": 8635040, "first_year": 2015}'::jsonb, 'https://www.instagram.com/WeAreTheWrecks/', 'https://www.wearethewrecks.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Nick Anderson', 'vocals, guitar, keys', 0),
      (b, 'Nick Schmidt', 'guitar', 1),
      (b, 'Aaron Kelley', 'bass', 2),
      (b, 'Billy Nally', 'drums', 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'd9447e90-e1f0-486f-b3dc-fc8208756370') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Kit Sebastian', 'London, UK', array['chanson','jazz']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "d9447e90-e1f0-486f-b3dc-fc8208756370", "deezer_id": 12151254, "first_year": 2018}'::jsonb, 'https://www.instagram.com/kitsebastianpop/', 'https://www.kitsebastian.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Merve Erdem', null, 0),
      (b, 'Kit Martin', null, 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '9b43db0b-da0a-47d4-9d4d-757213a37df7') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Carcosa', 'Vancouver, Canada', array['deathcore','death metal']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "9b43db0b-da0a-47d4-9d4d-757213a37df7", "deezer_id": 8492438, "first_year": 2020}'::jsonb, 'https://www.instagram.com/carcosabc/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Johnny Ciardullo', 'vocals', 0),
      (b, 'Andrew Baena', 'guitar', 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '86e0f9c1-a86a-4496-8437-c48086280386') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('VIAL', 'Minneapolis, MN', array['garage punk','garage rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "86e0f9c1-a86a-4496-8437-c48086280386", "deezer_id": 82763132, "first_year": 2019}'::jsonb, 'https://www.instagram.com/vialbandofficial/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Taylor Kraemer', 'bass, vocals, keytar', 0),
      (b, 'KT Branscom', 'guitar, vocals', 1),
      (b, 'Katie Fischer', 'drums', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '487a96f2-eefd-485e-892b-2cf240835bf4') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Vanishing Twin', 'London, UK', array['psychedelic pop','experimental']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "487a96f2-eefd-485e-892b-2cf240835bf4", "deezer_id": 10259260, "first_year": 2015}'::jsonb, 'https://www.instagram.com/vanishingtwinmusic/', 'https://www.vanishingtwin.co.uk/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Cathy Lucas', null, 0),
      (b, 'Valentina Magaletti', 'drums', 1),
      (b, 'Susumu Mukai', null, 2),
      (b, 'Elliott Arndt', null, 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '5866d653-5380-4ebb-b8b5-ba63810ab092') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Vistas', 'Edinburgh, UK', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "5866d653-5380-4ebb-b8b5-ba63810ab092", "deezer_id": 1116670, "first_year": 2016}'::jsonb, 'https://www.instagram.com/vistasmusic/', 'https://vistasmusic.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Prentice Robertson', null, 0),
      (b, 'Dylan Rush', 'guitar', 1),
      (b, 'Jamie Law', 'bass', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'd4185b44-d2db-447c-80b0-cc1da207a19b') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Crown Magnetar', 'Colorado Springs, CO', array['deathcore']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "d4185b44-d2db-447c-80b0-cc1da207a19b", "deezer_id": 13855831, "first_year": 2017}'::jsonb, 'https://www.instagram.com/crownmagnetar/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Dan Tucker', 'vocals', 0),
      (b, 'Nick Burnett', 'guitar', 1),
      (b, 'Byron London', 'drums', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'c602c091-19d7-4f3a-82f3-636d318c5445') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('The Velveteers', 'Boulder, CO', array['garage rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "c602c091-19d7-4f3a-82f3-636d318c5445", "deezer_id": 11121598, "first_year": 2014}'::jsonb, 'https://www.instagram.com/thevelveteers/', 'https://thevelveteers.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Demi Demitro', null, 0),
      (b, 'Johnny Fig', null, 1),
      (b, 'Baby Pottersmith', null, 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'fe59b55b-099a-4123-bf82-c1840b6662c2') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Pip Blom', 'Amsterdam, Netherlands', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "fe59b55b-099a-4123-bf82-c1840b6662c2", "deezer_id": 9757686, "first_year": null}'::jsonb, 'https://www.instagram.com/PipBlom/', 'https://www.pipblom.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Pip Blom', 'guitar, vocals', 0),
      (b, 'Tender Blom', null, 1),
      (b, 'Darek Mercks', null, 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '9b4f5865-eeba-4b00-9b54-d3c2ec9fbdf9') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('The Callous Daoboys', 'Alpharetta, GA', array['mathcore','metalcore']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "9b4f5865-eeba-4b00-9b54-d3c2ec9fbdf9", "deezer_id": 12190326, "first_year": 2016}'::jsonb, 'https://www.instagram.com/thecallousdaoboys/', 'https://www.thecallousdaoboys.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Carson Pace', 'vocals', 0),
      (b, 'Daniel Hodsdon', 'guitar', 1),
      (b, 'Maddie Caffrey', 'guitar', 2),
      (b, 'Jackie Buckalew', 'bass', 3),
      (b, 'Matthew Ryan', 'drums', 4),
      (b, 'Abby Sherman', 'synth', 5),
      (b, 'Amber Christman', 'violin', 6);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '6458d433-3108-4de3-b7fe-fb61a679e2e4') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Gouge Away', 'Fort Lauderdale, FL', array['hardcore','punk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "6458d433-3108-4de3-b7fe-fb61a679e2e4", "deezer_id": 5970474, "first_year": 2013}'::jsonb, 'https://www.instagram.com/gougeawayfl/', 'https://www.gougeaway.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Christina Michelle', null, 0),
      (b, 'Thomas Cantwell', null, 1),
      (b, 'Mick Ford', null, 2),
      (b, 'Tyler Forsythe', null, 3),
      (b, 'Theo Hartlett', null, 4);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '38d929d1-502d-486e-947a-00d6e4194039') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('BIG SPECIAL', 'West Midlands, UK', array['punk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "38d929d1-502d-486e-947a-00d6e4194039", "deezer_id": 160725902, "first_year": 2020}'::jsonb, 'https://www.instagram.com/bigspecial_/', 'https://bigspecial.co.uk/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Joseph Hicklin', null, 0),
      (b, 'Callum Moloney', null, 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'ec44206a-c3cc-419d-9ef9-08971c1297dd') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Coach Party', 'Isle of Wight, UK', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "ec44206a-c3cc-419d-9ef9-08971c1297dd", "deezer_id": 78203202, "first_year": null}'::jsonb, 'https://www.instagram.com/wearecoachparty/', 'https://coach-party.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Jessica Eastwood', 'vocals, bass', 0),
      (b, 'Stephanie Norris', 'guitar', 1),
      (b, 'Joe Perry', 'guitar', 2),
      (b, 'Guy Page', 'drums', 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '64367341-4bc2-493c-8e5d-ce17841c8a7a') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('mary in the junkyard', 'London, UK', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "64367341-4bc2-493c-8e5d-ce17841c8a7a", "deezer_id": 148939382, "first_year": null}'::jsonb, 'https://www.instagram.com/maryinthejunkyrd/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Clari Freeman-Taylor', 'vocals, guitar', 0),
      (b, 'Saya Barbaglia', 'viola, bass', 1),
      (b, 'David Addison', 'drums', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'e770edaf-ae43-4de0-99b5-c59734a1d57d') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Mad Foxes', 'Nantes, France', array['alternative rock','garage rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "e770edaf-ae43-4de0-99b5-c59734a1d57d", "deezer_id": 11278844, "first_year": 2015}'::jsonb, 'https://www.instagram.com/madfoxes_fr/', 'https://www.madfoxes.fr/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Lucas Bonfils', 'guitar, vocals', 0),
      (b, 'Arnaud Turquier', 'bass', 1),
      (b, 'Elie Paquereau', 'drums', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'f221328f-bc6b-40f1-a750-ce11a1321489') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('The Heliocentrics', 'London, UK', array['jazz-funk','jazz fusion']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "f221328f-bc6b-40f1-a750-ce11a1321489", "deezer_id": 853389, "first_year": 2006}'::jsonb, 'https://www.instagram.com/theheliocentrics/', 'https://theheliocentrics.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Malcolm Catto', null, 0),
      (b, 'Jake Ferguson', null, 1),
      (b, 'Raven Bush', null, 2),
      (b, 'Ray Carless', null, 3),
      (b, 'Orlando Julius', null, 4),
      (b, 'Adrian Owusu', null, 5),
      (b, 'Dan Smith', null, 6),
      (b, 'Max Weissenfeldt', null, 7),
      (b, 'Jack Yglesias', null, 8);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'd8339825-470a-4dde-9792-d5c724e14e18') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Chalk', 'Belfast, UK', array['dance-punk','post-punk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "d8339825-470a-4dde-9792-d5c724e14e18", "deezer_id": 285237501, "first_year": 2019}'::jsonb, 'https://www.instagram.com/chalkband/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Ross Cullen', null, 0),
      (b, 'Ben Goddard', null, 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'bdde1855-7f9a-4c9c-83cb-4b83dd14b578') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Termina', 'Toronto, Canada', array['metalcore']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "bdde1855-7f9a-4c9c-83cb-4b83dd14b578", "deezer_id": 6738411, "first_year": 2019}'::jsonb, 'https://www.instagram.com/terminaofficial/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Andy Cizek', 'vocals', 0),
      (b, 'Nik Nocturnal', 'drums, guitar, bass', 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'c2b967c8-e9b5-40a0-86f9-c2941d7434d2') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Svaneborg Kardyb', 'Aarhus, Denmark', array['jazz','electronic']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "c2b967c8-e9b5-40a0-86f9-c2941d7434d2", "deezer_id": 54999742, "first_year": null}'::jsonb, 'https://www.instagram.com/svaneborgkardyb/', 'https://svaneborgkardyb.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Nikolaj Svaneborg', 'synth, keys', 0),
      (b, 'Jonas Kardyb', 'percussion, drums', 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '423a85de-66ba-4113-abdc-ba2678ee89ba') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Ratboys', 'South Bend, IN', array['indie rock','alternative rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "423a85de-66ba-4113-abdc-ba2678ee89ba", "deezer_id": 7985936, "first_year": 2009}'::jsonb, 'https://www.instagram.com/ratboysband/', 'https://www.ratboysband.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Julia Steiner', null, 0),
      (b, 'Dave Sagan', null, 1),
      (b, 'Sean Neumann', 'bass', 2),
      (b, 'Marcus Nuccio', 'drums', 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'bcddbf54-6438-4a2d-af3b-e5d04d4724b2') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('The Guest List', 'Manchester, UK', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "bcddbf54-6438-4a2d-af3b-e5d04d4724b2", "deezer_id": 532074, "first_year": null}'::jsonb, 'https://www.instagram.com/theguestlist.band/', 'https://www.theguestlist.band/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Cai Alty', 'vocals, guitar', 0),
      (b, 'Leio Hunter', 'guitar', 1),
      (b, 'Tom Quigley', 'guitar', 2),
      (b, 'Sid Wallace', 'bass', 3),
      (b, 'Angus Gilchrist', 'drums', 4);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '32b742e1-2a14-49e1-9c00-fa2c28189e97') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Lowertown', 'Atlanta, GA', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "32b742e1-2a14-49e1-9c00-fa2c28189e97", "deezer_id": 57202152, "first_year": null}'::jsonb, 'https://www.instagram.com/lowrtown/', 'https://www.lowertown.band/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Avsha', null, 0),
      (b, 'Olivia O.', null, 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'd0d25805-3446-49eb-bf6b-b4fa821c3a7f') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Palehound', 'Boston, MA', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "d0d25805-3446-49eb-bf6b-b4fa821c3a7f", "deezer_id": 5248958, "first_year": 2014}'::jsonb, 'https://www.instagram.com/palehound/', 'https://www.palehound.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Ellen Kempner', 'guitar, vocals', 0),
      (b, 'Larz Brogan', 'bass', 1),
      (b, 'Jesse Weiss', 'drums', 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '41f03c6d-56e1-428a-a186-9e81e58c2592') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Folk Bitch Trio', 'Melbourne, Australia', array['indie folk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "41f03c6d-56e1-428a-a186-9e81e58c2592", "deezer_id": 158704702, "first_year": 2020}'::jsonb, 'https://www.instagram.com/fbtband/', 'https://www.folkbitchtrio.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Heide Peverelle', null, 0),
      (b, 'Jeanie Pilkington', null, 1),
      (b, 'Gracie Sinclair', null, 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'e6596bbc-3fef-40ae-a479-11ac46fb654a') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Lowland Hum', 'Greensboro, NC', array['folk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "e6596bbc-3fef-40ae-a479-11ac46fb654a", "deezer_id": 4863889, "first_year": 2012}'::jsonb, 'https://www.instagram.com/lowlandhum/', 'https://www.lowlandhum.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Daniel Levi Goans', null, 0),
      (b, 'Lauren Goans', null, 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '57ccf9a9-69da-47e0-9630-4c9125beeb88') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('SPIRIT OF THE BEEHIVE', 'Philadelphia, PA', array['indie rock','neo-psychedelia']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "57ccf9a9-69da-47e0-9630-4c9125beeb88", "deezer_id": 111911292, "first_year": null}'::jsonb, 'https://www.instagram.com/spiritofthebeehive/', null) returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Zack Schwartz', null, 0),
      (b, 'Rivka Ravede', null, 1),
      (b, 'Corey Wichlin', null, 2);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = 'a615b8f7-a9f6-4d7a-90c7-6fdf26b13411') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Guerilla Toss', 'Boston, MA', array['dance-punk','noise rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "a615b8f7-a9f6-4d7a-90c7-6fdf26b13411", "deezer_id": 5800575, "first_year": 2010}'::jsonb, 'https://www.instagram.com/guerillatoss/', 'https://guerillatoss.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Kassie Carlson', null, 0),
      (b, 'Peter Negroponte', null, 1),
      (b, 'Arian Shafiee', null, 2),
      (b, 'Sam Lisabeth', null, 3),
      (b, 'Stephen Cooper', null, 4);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '6069d86f-ca46-48a5-bb34-77d21f6e3d0a') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Charly Bliss', 'New York, NY', array['indie rock']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "6069d86f-ca46-48a5-bb34-77d21f6e3d0a", "deezer_id": 9730874, "first_year": 2012}'::jsonb, 'https://www.instagram.com/charlybliss/', 'https://www.charlybliss.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Eva Hendricks', 'guitar, vocals', 0),
      (b, 'Spencer Fox', 'guitar', 1),
      (b, 'Dan Shure', 'bass', 2),
      (b, 'Sam Hendricks', 'drums', 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '61fe64d2-983d-487c-bcb8-1e2fe07a1c98') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Home Front', 'Edmonton, Canada', array['post-punk','punk']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "61fe64d2-983d-487c-bcb8-1e2fe07a1c98", "deezer_id": 91614, "first_year": null}'::jsonb, 'https://www.instagram.com/arewenothomefront/', 'https://www.homefrontband.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Graeme MacKinnon', null, 0),
      (b, 'Clint Frazier', null, 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '963fa0ee-ceeb-4dbb-abcf-6b85cdc0a3ec') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('Half Me', 'Hamburg, Germany', array['metalcore']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "963fa0ee-ceeb-4dbb-abcf-6b85cdc0a3ec", "deezer_id": 76428102, "first_year": 2018}'::jsonb, 'https://www.instagram.com/half_me.mp3/', 'https://www.halfme.band/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Chris Zuehlke', 'vocals', 0),
      (b, 'Christopher Hesse', 'guitar', 1),
      (b, 'Tobias Max Sajons', 'bass', 2),
      (b, 'Maximilian Eisersdorff', 'drums', 3);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '8ec82549-c6fa-4b29-9ed0-5f685c6541a9') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('NECROTTED', 'Abtsgmünd, Germany', array['death metal','deathcore']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "8ec82549-c6fa-4b29-9ed0-5f685c6541a9", "deezer_id": 3624441, "first_year": 2008}'::jsonb, 'https://www.instagram.com/necrotted/', 'https://www.necrotted.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Fabian Fink', null, 0),
      (b, 'Johannes Wolf', null, 1);
  end if;
  if not exists (select 1 from public.bands where source_ref ->> 'mbid' = '31f07dfd-df64-48dc-856e-9968059b8e35') then
    insert into public.bands (name, city, genres, claim_state, source, source_ref, instagram_url, website_url)
    values ('The Bug Club', 'Caldicot, UK', array['indie rock','indie pop']::text[], 'unclaimed', 'musicbrainz', '{"mbid": "31f07dfd-df64-48dc-856e-9968059b8e35", "deezer_id": 122522732, "first_year": 2016}'::jsonb, 'https://www.instagram.com/thebugclubband/', 'https://www.thebugclubband.com/') returning id into b;
    insert into public.band_seats (band_id, name, role, rank) values
      (b, 'Sam Wilmett', null, 0),
      (b, 'Tilly Harris', null, 1);
  end if;
end $$;

-- Their page links, for the DMs:
select name, 'https://app.mixstro.com/b/' || id as page from public.bands where claim_state = 'unclaimed' order by id;
