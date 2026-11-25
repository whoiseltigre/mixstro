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

## 2. Reliable actions and messaging

| Item | Status | Evidence / next step |
|---|---|---|
| Stable send ids, unique per sender and conversation, canonical row returned | Verified working (DB + merge logic) | Migration `20261125010000` (`client_id` + partial unique index); `messages.test.sql` (retry = one, two intentional = two, no-id rows still accepted); `src/lib/outbox.ts` + tests. App falls back to id-less inserts before the SQL runs |
| Optimistic, acknowledgment and realtime merged by identity; per-send pending / failed / Retry | Implemented but unverified (UI) | `live-chat.tsx` outbox; unit tests cover realtime-before-ack and one failure among several sends. Needs a two-phone check |
| Newest-first with id tie-break, cursor paging to the oldest | Verified working (DB) | `messages.test.sql` (600+ rows, tie-break, cursor reaches all); chat opens on the newest 150 with "Load earlier messages" |
| Latest-per-thread inbox and waiting-on-me | Verified working (DB) | `latest_messages()` (RLS applies); `getThreads` and `yourTurnCount` use it, with the old scan as fallback |
| Realtime reconnect catches up | Implemented but unverified | Refresh on re-subscribe, on returning to the app and on `online` (DM and band chat) |
| Band chat read marker split from the loader | Implemented but unverified | `markBandRead` runs from the open chat, so prefetching the page leaves unread counts alone |
| Band chat send ids | Implemented but unverified | `band_messages.client_id`; retry of the same failed text reuses its id |
| Atomic signup | Verified working (DB) | `finish_onboarding()`: profile, influences and clips commit together, then onboarded; a bad clip leaves nothing behind (`messages.test.sql`) |
| Atomic "Another time" | Verified working (DB) | `reschedule_jam()`; a failed reschedule keeps the original invite |
| Durable notification intents | Verified working (DB) / unverified (delivery) | Intent written by trigger with the message; `claim_notification_intents` (SKIP LOCKED), backoff, 6-attempt cap, `notification_intent_health`; sent right after the send and drained by the 15-minute job. Provider idempotency for email/push not added yet (change required) |
| Signed-out or expired session never acknowledged | Verified working (DB) | `messages.test.sql` |
| Production/demo separation | Implemented but unverified | `/api/health` (PR 1). Sample people stay on by decision |
| Pass / Connect / quick replies typed outcomes | Change required | Connect and Pass already return outcomes; quick reply should check its message insert |

## 3. Release 1: openings and local discovery

| Item | Status | Evidence / next step |
|---|---|---|
| Opening on a Board post (one identity): needed / offered role, rehearsal days, radius, optional date, status, expiry | Verified working (DB) | Migration `20261125020000`; `openings.test.sql` |
| Open / paused / filled / expired, explicit renew, owner can pause or fill now | Verified working (DB) | `set_opening_status`, `renew_opening`, `expire_openings` (15-minute job); status and `closed_at` kept in step for older clients |
| Transitions recorded | Verified working (DB) | `opening_events` |
| Eligible local selection before the limit | Verified working (DB) | `opening_candidates`: blocks, self, known relationships, discoverability, role (family synonyms via `expandRoles`), status, distance, then limit. Survives 220 newer Dallas accounts |
| Today: pending invitations fetched on their own; local filter before the limit | Verified working (DB) / unverified (app) | `local_candidates`; `todayCandidates` in `people.ts` (old read kept as fallback) |
| Missing location distinct from zero supply | Verified working (DB) | State `no_location` vs empty `ok`; zero supply recorded in `opening_supply` |
| Ranking: reciprocal fit, overlapping days, shared artists, distance, id | Verified working (DB) | Interpretable order in SQL; compare against replies once there's data |
| Honest reasons, no implied availability | Verified working | `src/lib/opening-reasons.ts` + tests ("Also rehearses Thursdays", never "free Thursday at 7") |
| Sparse market state with alert action | Implemented but unverified (UI) | Opening panel on your post: "No drummers within 15 mi have joined yet" + "Tell me when a drummer joins" |
| Alerts when an opening opens or renews, deduped and capped | Verified working (DB) / unverified (delivery) | `queue_opening_alerts` → intents (one per opening, renewal and person; max 3 a week; blocks excluded); delivered by `notifyOpening` under the "Musicians you're looking for" preference |
| Activation instrumentation | Implemented but unverified | Pulse "Openings" section (`opening_pulse`): open, zero supply by role, opened/filled/expired |
| Primary measure (two-way conversation within 7 days of an opening) | Change required | Needs attribution of conversations to openings (PR 5 adds the source on replies); cohort query next |

## 4. Release 2: shareable opening links

| Item | Status | Evidence / next step |
|---|---|---|
| Owner chooses to share; link shows only role, approximate area, days, author, band and one chosen clip | Verified working (DB) | Migration `20261125030000`; `public_opening()` (anon) returns neighborhood only, never exact location, never other clips; `opening-links.test.sql` |
| Shared clip must be the poster's own | Verified working (DB) | `board_post_share_check` trigger |
| Paused / filled / expired / unshared links show the real state | Verified working (DB) / unverified (UI) | `public_opening` status; `/o/[id]` headline and CTA per state |
| Blocked viewer can't see the link | Implemented but unverified | `/o/[id]` returns 404 for a signed-in viewer across a block |
| Signed-out reply: draft kept, sign in, come back to the same opening | Implemented but unverified | Draft in localStorage for 24 h; `mx_return` cookie (only `/o/<id>`, see `return-path.ts` + tests); middleware sends the signed-in user back once. Sending is always a manual tap |
| Reply outcomes typed (sent / already / closed / own / signed out) | Implemented but unverified | `src/app/o/actions.ts`; reply recorded with source `link`, then a connection request and the reply notification |
| Link open / listen counts, budgeted, no personal data | Verified working (DB) | `opening_link_counts`, `opening_link_count` (service role), `/api/openings` with per-IP and global budgets |
| Not indexed | Implemented | `noindex` metadata on `/o/[id]` |
| Real-device share sheet, Instagram/WhatsApp previews | Blocked on external access | Needs physical phones |
