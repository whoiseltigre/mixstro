# Mixstro design system: House Lights

The interface is the dark room; the musicians are the light. Warm neutrals do most of the work,
one tungsten spotlight per screen, and each part of the app gets its own colored gel.

- **Tokens:** `src/styles/tokens.css` (CSS, becomes Tailwind utilities) and `src/lib/tokens.ts` (the same values for code).
- **Live reference:** `/design` in the app (not indexed). Every swatch, size and curve there renders from the real tokens.
- **Guard:** `npm run lint:design` fails when new code uses a raw hex color, pixel font size, pixel radius or hand-written easing in a class name. Known exceptions live in `scripts/design-allowlist.json`.

New UI uses token names, never raw values. If a value you need isn't a token, add the token (and a line here) rather than a one-off.

## Color

| Token | Value | Use |
|---|---|---|
| `ink` | #0F0D0B | Page background |
| `stage` | #1A1816 | Cards, fields |
| `riser` | #292624 | Raised controls on a card |
| `smoke` | #A8A49E | Secondary text |
| `paper` | #F5F1EC | Primary text, primary button |
| `tungsten` | #FFB245 | Create, "playing now", and an opening for you. Nothing else (see "What each color means"). |
| `danger` / `danger-soft` | #FF453A / #FF8A80 | Destructive buttons / error text on Ink |
| `success` | #30D158 | Confirmations |

**Gels** are the color splashes. Each area owns one: a "stage spill" glow at the top of the screen and tints on its icons and tags. Use them at 10-20% as fills (`bg-gel-blue/15 text-gel-blue`), full strength for small marks.

| Gel | Area |
|---|---|
| `gel-peach` #F7BF77 | Today, Settings |
| `gel-pink` #FFACBA | Activity, Connect moments |
| `gel-blue` #B5C5FF | Board, Post |
| `gel-teal` #67E2DA | Messages, "Now" |
| `gel-violet` #C9B6FF | Bands |

The **gel rim** (`gel-rim`, all gels in one ring) is for peak moments only: Connect and a new connection.

Hairlines on Ink: `border-paper/8` faint, `/12` standard, `/20` strong (also `--line-faint`, `--line`, `--line-strong`).

## What each color means

Color carries meaning, so each one has a short list of jobs. `npm run lint:design` enforces the first two.

- **Tungsten** means exactly three things: Create (the + in the tab bar and the desktop Create button), "playing now" (the play button while a song plays), and "an opening for you" (an open spot in a band). It is never a link color, a tick, a selected state or a section label.
- **The gel rim** (`gel-rim`, `variant="gel"`) is for two moments only: Connect, and a new connection.
- **Paper** is every primary button, text link, tick and selected state.
- **Each area has a gel** that tints its top glow and its eyebrows: Home peach, Board blue, Messages teal, Profile pink, Bands violet (`AREA_GEL` in `src/lib/tokens.ts`). The glow shows on phones as well as desktop.

## Components

There is one of each. Use them from `src/components/ui.tsx` instead of writing classes by hand.

| Component | Notes |
| --- | --- |
| `Button`, `ButtonLink` | Sizes `lg` 56px (the main action on a screen), `md` 48px (cards and sheets), `sm` 44px (inline). Nothing tappable is under 44px. Variants: `primary` (Paper), `glass`, `danger`, and `gel` for Connect only. |
| `Field`, `TextArea`, class `field` | One input shape, 52px tall, border `--line-field` (3:1 against the background). `field-inset` for inputs inside a card, `field-search` for search bars. |
| `Toggle`, `ToggleRow` | The one switch. Its "on" color is `--toggle-on`. |
| `PlayButton` | Glass at rest, Tungsten while playing. |
| `Chip` | 44px, Paper when selected. |
| `PostCard` | Board posts. The cover has three designs (`data-covers`): Spotlight, Record, Flyer. |
| `ProjectList` | A profile's projects as a record shelf: big covers, the picked record's songs underneath. |

Small labels are 12px (`text-caption`) at the smallest. 11px (`text-caption2`) is for badge counts only.

## Trying a look

`/design` opens with "Try a look": switches for the handful of choices that are still open (switch color, own chat bubbles, glow strength, title weight, field shape, Board cover). Each one flips a single token through a `data-*` attribute on `<html>` (`src/lib/design-choices.ts`, read by `src/styles/tokens.css`), is remembered in that browser only, and changes the whole app at once. To make a choice permanent, change the token's default in `tokens.css` and remove the choice from the list.

## Screen patterns

- **Today is a lineup, not a deck.** Everyone picked for you today is on one screen with why you two might click and one action, Connect. There is no Pass and no X; tomorrow brings new people.
- **Home leads with people.** Who is waiting on you, musicians near you, then one slim "Your page" row and the Board. There is one checklist in the app and it is that row.
- **Your Profile tab is your profile.** It looks the way others see it. Every part you can change has a pencil at its top right, Settings is the gear, and anything still empty is a dashed "add" slot where it will live.
- **Making something is full screen.** New post is three steps with a progress bar and no tab bar.
- **Wide screens get their own layout**: profiles and the band hub use two columns, the Board is a grid.

## Type

SF Pro on Apple devices (Geist / Inter Tight elsewhere), Outfit only for the wordmark. Weight carries hierarchy gently: 400 to read, 500-560 for labels (`font-semibold` is 560), **640 only for titles** (`font-bold`; the `headline` utility is 620), never heavier. Most text on a screen should be regular weight: semibold is for names, row titles and buttons, not for details. Titles use the `headline` utility (display face, tight tracking, balanced lines). Small all-caps labels use `eyebrow`.

| Class | px | Use |
|---|---|---|
| `text-hero` | 52 | Big moments |
| `text-display-lg` | 44 | Profile name |
| `text-display-md` | 40 | |
| `text-display` | 34 | Screen title |
| `text-display-sm` | 32 | |
| `text-title-lg` | 28 | Section hero |
| `text-title1` | 24 | Large card title |
| `text-title2` | 22 | Section title |
| `text-title3` | 20 | Card title |
| `text-title4` | 18 | |
| `text-body-lg` | 17 | Buttons, list titles |
| `text-body` | 16 | Body |
| `text-callout` | 15 | Secondary body, chips |
| `text-subhead` | 14 | Supporting text |
| `text-footnote` | 13 | Meta, labels |
| `text-caption` | 12 | Captions, eyebrows |
| `text-caption2` | 11 | Badges |

## Shape and depth

Anything you tap is a pill (`rounded-full`). Surfaces round off more the bigger they are:

`rounded-xs` 10 · `rounded-control` 12 · `rounded-field` 14 · `rounded-2xl` 16 · `rounded-tile` 18 · `rounded-card` 20 · `rounded-card-lg` 22 · `rounded-panel` 24 · `rounded-sheet` 28 · `rounded-hero` 32

- `glass`: liquid glass for chrome floating over content (tab bar, round buttons, chips over photos).
- `glass-thick`: menus, toasts, text over busy photos.
- Shadows only for layers that float: `shadow-lift` (hovered control), `shadow-float` (menus, toasts), `shadow-sheet`, `shadow-spotlight` (the tungsten glow).

## Motion

One physical feel everywhere: things arrive on a spring, leave quickly, and never block a tap.

**Curves** (`ease-*` utilities, `var(--ease-*)` in CSS):

| Token | Feel | Use |
|---|---|---|
| `ease-spring` | No overshoot (stiffness 170, damping 26) | Screens, sheets, a photo growing into a profile |
| `ease-spring-snappy` | 2% overshoot (380 / 30) | Press release, the tab pill, anything flicked |
| `ease-spring-bouncy` | 9% overshoot (300 / 21) | Picks and celebrations only |
| `ease-standard` | Fast out, gentle in | Fades and rises |
| `ease-settle` | Even | Moving between two places |
| `ease-exit` | Slow start | Leaving the screen |

Springs are real spring physics sampled into CSS `linear()`; browsers without it (Safari < 17.2) fall back to a close cubic-bezier automatically. For JS-driven animation read `MOTION.spring()` from `src/lib/tokens.ts`, so JS and CSS share one curve.

**Durations** (`var(--duration-*)`, or `duration-(--duration-base)` in classes): instant 90 (press down) · quick 160 (state, exits) · base 280 (fades, rises, list rows) · slow 450 (glows, progress) · spring 520 (a spring's full settle).

**Patterns**

- **Press:** anything tappable gets `press` (buttons, chips) or `press-card` (big cards, photos). It dips the instant a finger lands and springs back. `Button` and `Chip` already have it.
- **Shared element:** a person's photo grows into their profile and shrinks back on Back. Use `HeroLink` (src/components/hero.tsx) with `heroKey`; the destination marks its photo with `data-hero={key}`. Built on the View Transitions API; elsewhere it's the normal screen slide.
- **Screens:** going deeper slides in from the right, switching tabs or going back cross-fades (`ScreenEnter`).
- **Sheets:** `Sheet` springs up, follows your finger down, keeps your flick's speed, closes on Back or Escape.
- **Lists:** `stagger` on a list makes rows rise in one after another (first 10 only).
- **Loading:** every route has a skeleton (`components/skeletons.tsx`) shaped like the real screen, so nothing jumps when it arrives.
- **Reduce Motion:** all of it collapses to instant cross-fades automatically. Don't add motion that only works with it on.

## Haptics

Paired with motion, never on their own. `haptic(kind)` from `src/lib/haptics.ts`, or `data-haptic="kind"` on any element (works in server components).

| Kind | When |
|---|---|
| `tap` | A button or card was pressed and something will happen (all `Button`s) |
| `select` | A chip, tab, segment or toggle changed (all `Chip`s, tabs) |
| `success` | A Connect landed, a post went up, a song was added |
| `warning` | Blocked, or needs another look |
| `heavy` | A drag passed its point of no return |

Native Taptic Engine in the iPhone app, a short vibration on Android, and the system switch tick in iPhone Safari 18+.

## Voice in the UI

Not a dating app: never "match", no swiping, no italic serif. Plain, warm, musician-to-musician.
