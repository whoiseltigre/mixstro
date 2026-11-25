# Austin handoff: status by item

Tracks the November 24 engineering handoff. Baseline: main at `d51c183d` (recorded 2026-11-25).
Statuses: **verified working**, **implemented but unverified**, **change required**, **blocked on external access**.
"Verified" here means verified by an automated check in this repo (CI or `npm run test:db`), unless it says otherwise.

## Baseline at d51c183

| Check | Result |
|---|---|
| Typecheck, lint, design tokens | Pass |
| Band name generator tests | 9/9 pass |
| Production build (`next build`) | Pass, with self-hosted fonts (the earlier font-fetch blocker is gone) |
| Migration replay | 25 migrations replay cleanly on plain Postgres 16 with Supabase stubs |
| Production dependency advisories | `sharp` high (libvips/libheif/librsvg) fixed by `npm audit fix` (0.34.5 → 0.35.5). `postcss` bundled inside Next: build-time only, needs Next 16; owned exception until 2027-01-31 |
| Production host | app.mixstro.com and mixstro.com: AWS Amplify (us-east-1), DNS on Route 53; staging.mixstro.com builds `main`. Edge configuration evidence: **blocked on external access** (AWS console) |
| Deployed revision | Production == main `d51c183` per the 2026-11-25 launch check. From this PR on, `GET /api/health` reports the built SHA (Amplify `AWS_COMMIT_ID`) |
| Production grants, provider controls | **Blocked on external access**: needs the Supabase dashboard (Sundy). The SQL in `supabase/tests/grants.test.sql` is the query to compare against |
| Real-device performance | **Blocked on external access**: needs a physical iPhone and a midrange Android |

## 1. Release and abuse controls

| Item | Status | Evidence / next step |
|---|---|---|
| CI: lockfile install, typecheck, lint, tokens, unit tests, build | Verified working | `.github/workflows/ci.yml` job `check` |
| Migrations on a fresh database and on production-shaped legacy data | Verified working | Job `database`: `scripts/db-test.mjs` (fresh, plus legacy seed then newer migrations, applied twice) |
| Effective privileges under real roles | Verified working (staging-equivalent) | `supabase/tests/*.test.sql` run as anon / authenticated / service_role. Production grants still need the operator to run the grants query |
| Dependency advisories with owners | Verified working | `scripts/check-audit.mjs` + `scripts/audit-exceptions.json` |
| Secret scanning | Implemented but unverified | Job `secrets` (gitleaks) runs on GitHub only |
| Deployed build SHA | Implemented but unverified | `/api/health`; verify on staging after merge |
| Production health fails without auth settings | Implemented but unverified | `/api/health` answers 503 in production without database or server key |
| Anonymous ballots: server-only mutation boundary | Verified working (DB) | Migration `20261125000000`: ballot and tool-count functions execute only as service_role; `supabase/tests/ballots.test.sql` proves anon and members are refused. Voter id comes only from the httpOnly cookie. Existing links and organizers keep working (same organizer hash) |
| Ballots: one vote per browser per round, choice changes, atomic rounds | Verified working (DB) | `ballots.test.sql` |
| Ballot and telemetry budgets: per browser, per address and global | Implemented but unverified (app) / verified (DB limiter) | `src/lib/request-guard.ts` `withinBudget` + `rate_hit`; per-organizer cap of 20/hour beside the global 300/hour. Limiter outage lets requests through (logged) and the DB brakes still hold |
| Tool counts are low-trust telemetry | Verified working | Counted only within budget; completed signups come from committed profile rows (Pulse), never from these counts |
| Music lookups: body cap before parsing, field validation, budgets, dedupe, miss caching | Implemented but unverified (routes) / verified (validator) | `readJson` caps at 64 KB even without Content-Length; `src/lib/journey-validate.ts` (+ unit tests); `memoLookup` shares in-flight reads, keeps successes, briefly keeps misses, never keeps errors; player cache now forgets failures |
| Edge and direct backend per route family | Blocked on external access | Needs AWS (CloudFront/WAF) and Supabase dashboards to document protection per route family |
| Consent, blocks | Verified working (DB) | `connections.test.sql` (crossed requests converge, only the recipient accepts, blocked pair can't connect or message, connection hidden) |
| Private media URL expiry, push device caps | Implemented but unverified | Unchanged from PR #61; needs a staging check |
| Account deletion | Change made, unverified end to end | Completion update is now checked; `reportStuckDeletions` logs out-of-retry and day-old jobs with a safe resume path (reset attempts). Needs a staging run with an interrupted deletion |
