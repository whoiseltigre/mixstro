# Mixstro

Where musicians meet. Mixstro is for three things: showing off your whole musical journey, finding people to start or fill out a band, and networking for gigs and other musicians. No swiping: five musicians worth meeting each day, based on shared influences, goals, and where and when you play.

Installable web app (PWA) built with Next.js 15, Tailwind CSS 4 and Supabase.

## Run it

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev
```

Open http://localhost:3000 on a phone-sized window, or add it to your iPhone home screen.

**Demo mode.** With no Supabase keys in `.env.local`, every sign-in button skips straight into onboarding, answers are kept in the browser, and the Today, Board and Messages tabs show sample musicians. This is handy for design review.

## Supabase setup

1. Create a project at supabase.com and put its URL and anon key in `.env.local`.
2. Run the schema in `supabase/migrations/` (SQL editor, or `supabase db push` with the CLI).
3. Authentication → Providers: turn on Email (OTP code), Apple and Google. Add `https://<your-domain>/auth/callback` as a redirect URL.
4. Authentication → Email templates → Magic link: include `{{ .Token }}` so people get a 6-digit code.

## What's here

| Area | Path |
| --- | --- |
| Welcome and sign in (Apple, Google, email code) | `src/app/page.tsx`, `src/app/auth/*` |
| Onboarding, 7 steps then "You're in" | `src/app/onboarding/*`, state in `src/lib/onboarding.ts` |
| Today, profile, connected, Board, Messages, chat, me | `src/app/(app)/*` (sample data in `src/lib/mock.ts`) |
| House Lights tokens, glass, Gel | `src/app/globals.css` |
| Shared UI | `src/components/*` |
| Database schema with row-level security | `supabase/migrations/` |

## Design rules (House Lights)

- Warm neutrals do 95% of the work: Ink `#0F0D0B`, Stage `#1A1816`, Riser `#292624`, Smoke `#A8A49E`, Paper `#F5F1EC`.
- Tungsten `#FFB245` is the only accent, at most once per screen.
- The Gel sheen (`var(--gel)`) is only for peak moments: Connect and a new connection.
- Headlines use SF Pro Display / Inter Tight 800 at -0.035em. No serif or italic display type.

## Artist search

Influences search `/api/artists?q=` (`src/app/api/artists/route.ts`, `src/lib/artist-search.ts`). It uses Deezer, free with no key, until the Apple Music key is set; then it switches to Apple Music on its own. Artist ids are a slug of the name on both, so shared influences keep matching after the switch.

To switch to Apple Music (needs the paid Apple Developer Program):

1. Certificates, Identifiers & Profiles → Identifiers → + → Media IDs, register e.g. `media.com.mixstro`.
2. Keys → + → tick Media Services (MusicKit), link the Media ID, download the `.p8` file (one download only).
3. Add `APPLE_TEAM_ID`, `APPLE_MUSIC_KEY_ID` and `APPLE_MUSIC_PRIVATE_KEY` (the .p8 text) to `.env.local` and to the hosting provider's environment variables, then redeploy.

## Not wired up yet

- Apple Music (MusicKit) and Spotify: connecting currently fills in a sample top-artists list.
- Photo upload to Supabase Storage. The photo is previewed locally only.
- Reverse geocoding for "Use my current location".
- Real matching, connections and messaging against the database. The tabs use sample data.
