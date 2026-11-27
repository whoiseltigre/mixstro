# Hosting on Cloudflare Workers

Mixstro is moving from AWS Amplify to Cloudflare Workers (via [OpenNext](https://opennext.js.org/cloudflare)).
Hostnames stay the same, so links, SEO and the Supabase `pg_cron` reminder call keep working.

## Commands

| Command | What it does |
| --- | --- |
| `npm run cf:build` | Builds the worker into `.open-next/` and copies share-card fonts into static assets |
| `npm run cf:preview` | Builds, then runs the worker locally on http://localhost:8787 (put env vars in `.dev.vars`) |
| `npm run cf:deploy` | Builds and deploys to the `mixstro` worker (production) |
| `npx opennextjs-cloudflare deploy --env staging` | Deploys to `mixstro-staging` |

Local preview needs prerendered pages loaded once: `npx opennextjs-cloudflare populateCache local`.

## Workers

| Worker | Git branch | Hostnames |
| --- | --- | --- |
| `mixstro` | `production` | app.mixstro.com, mixstro.com, www.mixstro.com |
| `mixstro-staging` | `main` | staging.mixstro.com |

Workers Builds settings: build command `npm run cf:build`, deploy command
`npx opennextjs-cloudflare deploy` (staging: add `--env staging`). Needs the Workers Paid plan:
the gzipped worker is about 3.1 MB, over the free plan's 3 MB limit.

Current setup (Mixstro Cloudflare account): worker `mixstro` is connected to this repo with the
commands above. Builds for non-production branches are off, so other branches don't get failing
checks. Until this PR merges, its production branch points at the PR branch for a private
workers.dev test; after the merge, switch it to `production`. Build variables set so far:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Amplify only ever had four variables
(those two plus the `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secrets); the rest below are optional.

Bindings (in `wrangler.jsonc`): R2 bucket `mixstro-next-cache` (`-staging` for staging) holds
prerendered pages; a Durable Object queue refreshes pages that set `revalidate`.

## Environment variables

Set these on each worker (Settings > Variables and Secrets) and, for `NEXT_PUBLIC_*`, also as
build variables, since Next inlines them at build time:

- Build + runtime: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
  `NEXT_PUBLIC_SAMPLE_PEOPLE`, `NEXT_PUBLIC_APPLE_SIGN_IN`
- Runtime secrets: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` (optional),
  `APPLE_MUSIC_PRIVATE_KEY`, `YOUTUBE_API_KEY`
- Runtime plain: `APP_URL`, `NOTIFY_FROM`, `SAFETY_ALERT_TO`, `VAPID_SUBJECT`, `APPLE_MUSIC_KEY_ID`,
  `APPLE_TEAM_ID`, `APPLE_MUSIC_STOREFRONT`, `MIXSTRO_ALLOW_DEMO`

## Differences from Amplify

- No filesystem at runtime. Anything read from disk on request must be prerendered or copied into
  static assets (see `scripts/cf-copy-assets.mjs` and `src/lib/share-cards.tsx`).
- Files in `public/` are served by Cloudflare directly, so their headers come from `public/_headers`,
  not `headers()` in `next.config.ts`. Keep the two in sync.
