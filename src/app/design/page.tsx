import type { Metadata } from "next";
import { Button, Chip, Field, PlayButton, SectionLabel, TextArea, Wordmark } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import type { BoardPost } from "@/lib/board";
import { DesignChoices } from "./choices";
import { ToggleDemo } from "./motion-lab";
import { MotionLab, HapticRow } from "./motion-lab";

export const metadata: Metadata = {
  title: "Design system · Mixstro",
  robots: { index: false, follow: false },
};

/**
 * The living reference for the design system (DESIGN.md is the written one). Everything here
 * renders from the same tokens and components the app uses, so it can't drift.
 */

const NEUTRALS = [
  ["ink", "#0F0D0B", "Page"],
  ["stage", "#1A1816", "Cards, fields"],
  ["riser", "#292624", "Raised controls"],
  ["smoke", "#A8A49E", "Secondary text"],
  ["paper", "#F5F1EC", "Text, primary button"],
  ["tungsten", "#FFB245", "Create, playing now, an opening for you"],
] as const;

const GELS = [
  ["gel-peach", "#F7BF77", "Today, Settings"],
  ["gel-pink", "#FFACBA", "Activity, Connect"],
  ["gel-blue", "#B5C5FF", "Board, Post"],
  ["gel-teal", "#67E2DA", "Messages, Now"],
  ["gel-violet", "#C9B6FF", "Bands"],
] as const;

const TYPE = [
  ["hero", 52, "Big moments"],
  ["display-lg", 44, "Profile name"],
  ["display", 34, "Screen title"],
  ["title-lg", 28, "Section hero"],
  ["title1", 24, "Card title, large"],
  ["title2", 22, "Section title"],
  ["title3", 20, "Card title"],
  ["body-lg", 17, "Buttons, list titles"],
  ["body", 16, "Body"],
  ["callout", 15, "Secondary body, chips"],
  ["subhead", 14, "Supporting text"],
  ["footnote", 13, "Meta, labels"],
  ["caption", 12, "Captions, eyebrows"],
  ["caption2", 11, "Badges"],
] as const;

const RADII = [
  ["xs", 10],
  ["control", 12],
  ["field", 14],
  ["tile", 18],
  ["card", 20],
  ["card-lg", 22],
  ["panel", 24],
  ["sheet", 28],
  ["hero", 32],
] as const;

const RADIUS_CLASS: Record<string, string> = {
  xs: "rounded-xs",
  control: "rounded-control",
  field: "rounded-field",
  tile: "rounded-tile",
  card: "rounded-card",
  "card-lg": "rounded-card-lg",
  panel: "rounded-panel",
  sheet: "rounded-sheet",
  hero: "rounded-hero",
};

const TEXT_CLASS: Record<string, string> = {
  hero: "text-hero",
  "display-lg": "text-display-lg",
  display: "text-display",
  "title-lg": "text-title-lg",
  title1: "text-title1",
  title2: "text-title2",
  title3: "text-title3",
  "body-lg": "text-body-lg",
  body: "text-body",
  callout: "text-callout",
  subhead: "text-subhead",
  footnote: "text-footnote",
  caption: "text-caption",
  caption2: "text-caption2",
};

const author = { id: "maya", username: "maya", name: "Maya Torres", instrument: "Bass", photo: "/photos/bass-blue.jpg" };
const SAMPLE_POSTS = [
  { id: "s-1", sample: true, kind: "Band seeking", title: "Drummer for neo-soul trio", role: "Drums", paid: true, isNew: true, author, distanceMi: 4, mine: false, meta: "Echo Park · Gigs monthly · Paid", foot: "6 musicians interested" },
  { id: "s-2", sample: true, kind: "Session", title: "Rhythm guitar for an EP", role: "Guitar", paid: true, isNew: false, author, distanceMi: 3, mine: false, meta: "Studio City · 3 days · $300/day", foot: "Closes Friday" },
  { id: "s-3", sample: true, kind: "Collab", title: "Co-writer, folk and ambient", role: "Songwriter", paid: false, isNew: false, author, distanceMi: 6, mine: false, meta: "Remote or LA · Just for fun", foot: "2 musicians interested" },
] as unknown as BoardPost[];

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5 pt-12 first:pt-0">
      <div className="flex flex-col gap-1.5 max-w-[620px]">
        <h2 id={id} className="headline text-title-lg">
          {title}
        </h2>
        <p className="text-callout text-smoke text-pretty">{intro}</p>
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, hex, use }: { name: string; hex: string; use: string }) {
  return (
    <li className="flex flex-col gap-2 min-w-0">
      <span className="h-20 rounded-tile border border-paper/10" style={{ background: hex }} />
      <span className="flex flex-col">
        <span className="text-subhead font-semibold">{name}</span>
        <span className="text-caption text-smoke tabular-nums">{hex}</span>
        <span className="text-caption text-smoke">{use}</span>
      </span>
    </li>
  );
}

export default function DesignSystem() {
  return (
    <main className="isolate relative min-h-dvh px-5 md:px-10 pt-safe pb-24 max-w-[1100px] mx-auto">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 opacity-70" style={{ background: "radial-gradient(60% 70% at 30% 0%, rgb(255 178 69 / 0.35), transparent), radial-gradient(50% 60% at 85% 10%, rgb(181 197 255 / 0.25), transparent)" }} />
      <header className="pt-8 pb-6 flex flex-col gap-4">
        <Wordmark size={22} />
        <span className="eyebrow text-tungsten">Design system</span>
        <h1 className="headline text-display-lg max-w-[640px]">House Lights</h1>
        <p className="text-body-lg text-paper/80 max-w-[560px] text-pretty">
          The interface is the dark room; the musicians are the light. Warm neutrals do most of the work, one tungsten spotlight per screen, and each part of the app gets its own colored gel.
        </p>
      </header>

      <Section id="decide" title="Try a look" intro="Small decisions you can flip and then walk through the real app with. Each one changes a single token, so every screen follows.">
        <DesignChoices />
      </Section>

      <Section id="color" title="Color" intro="Neutrals for the room. Tungsten means three things only: Create (the + button), something playing right now, and an opening meant for you. Links, ticks and selected states are Paper.">
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {NEUTRALS.map(([n, h, u]) => (
            <Swatch key={n} name={n} hex={h} use={u} />
          ))}
        </ul>
        <SectionLabel>Gels: the color splashes. Each area of the app owns one, as a glow at the top of the screen and a tint on its icons.</SectionLabel>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {GELS.map(([n, h, u]) => (
            <Swatch key={n} name={n} hex={h} use={u} />
          ))}
        </ul>
        <div className="gel-rim rounded-panel">
          <div className="rounded-[22.5px] bg-ink px-5 py-4 text-callout">
            <span className="font-semibold">The gel rim.</span> <span className="text-smoke">All gels at once, for peak moments only: Connect and a new connection.</span>
          </div>
        </div>
      </Section>

      <Section id="type" title="Type" intro="SF Pro on Apple devices. Weight carries hierarchy gently: 400 for reading, 500 to 560 for labels, 620 for titles. Never heavier.">
        <ul className="flex flex-col divide-y divide-paper/8 border-y border-paper/8">
          {TYPE.map(([n, px, u]) => (
            <li key={n} className="py-3 grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr_200px] items-baseline gap-4">
              <span className="text-footnote text-smoke tabular-nums">
                {n} · {px}
              </span>
              <span className={`${TEXT_CLASS[n]} ${px >= 20 ? "headline" : "font-medium"} truncate`}>Where musicians meet</span>
              <span className="hidden md:block text-footnote text-smoke">{u}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="shape" title="Shape and depth" intro="Anything you tap is a pill. Surfaces round off more the larger they are. Glass is for chrome that floats over content; shadows only for layers that float.">
        <ul className="grid grid-cols-3 md:grid-cols-9 gap-4">
          {RADII.map(([n, px]) => (
            <li key={n} className="flex flex-col gap-2">
              <span className={`aspect-square bg-stage border border-paper/12 ${RADIUS_CLASS[n]}`} />
              <span className="text-caption">
                <span className="font-semibold">{n}</span> <span className="text-smoke">{px}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="relative overflow-hidden rounded-panel p-6 grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ background: "linear-gradient(135deg, #3a2e22, #1a1816 40%, #22263a)" }}>
          <div className="glass rounded-card p-4 flex flex-col gap-1">
            <span className="text-subhead font-semibold">glass</span>
            <span className="text-caption text-paper/70">Tab bar, round buttons, chips over photos</span>
          </div>
          <div className="glass-thick rounded-card p-4 flex flex-col gap-1">
            <span className="text-subhead font-semibold">glass-thick</span>
            <span className="text-caption text-paper/70">Menus, toasts, text over busy photos</span>
          </div>
          <div className="bg-stage rounded-card p-4 flex flex-col gap-1 shadow-float">
            <span className="text-subhead font-semibold">stage + shadow-float</span>
            <span className="text-caption text-paper/70">Cards that lift off the page</span>
          </div>
        </div>
      </Section>

      <Section id="components" title="Components" intro="One of each. If a screen needs something that looks like one of these, it uses this one. Every button dips the instant a finger lands and carries a haptic.">
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-8">
          <div className="flex flex-col gap-3">
            <SectionLabel>Button: Paper is the main action, glass the second, danger for destructive ones</SectionLabel>
            <Button>Primary</Button>
            <Button variant="glass">Secondary (glass)</Button>
            <Button variant="danger">Delete account</Button>
            <div className="flex flex-wrap gap-2.5 items-center">
              <Button size="md">Medium, in cards</Button>
              <Button size="sm">Small, inline</Button>
              <Button size="sm" variant="glass">Small glass</Button>
            </div>
            <p className="text-footnote text-smoke">Three heights: 56, 48 and 44. Nothing tappable is shorter than 44.</p>
          </div>
          <div className="flex flex-col gap-3">
            <SectionLabel>Gel rim: Connect and a new connection, nowhere else</SectionLabel>
            <Button variant="gel">Connect</Button>
            <p className="text-footnote text-smoke">The design check fails if the rim shows up on any other screen.</p>
            <SectionLabel>Switch: one color everywhere</SectionLabel>
            <ToggleDemo />
            <SectionLabel>Play: Paper on glass, Tungsten only while playing</SectionLabel>
            <div className="flex items-center gap-3">
              <PlayButton />
              <PlayButton playing />
              <PlayButton size={34} />
              <span className="text-footnote text-smoke">Resting, playing, compact</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <SectionLabel>Text field: one outline, readable placeholder</SectionLabel>
            <Field id="ds-field" label="Title" placeholder="Drummer for a neo-soul trio" />
            <TextArea id="ds-area" label="Details" rows={3} placeholder="We gig about once a month and rehearse Thursdays." />
            <input aria-label="Search" placeholder="Name, instrument or band" className="field-search h-[52px] px-5 text-body" />
          </div>
          <div className="flex flex-col gap-4">
            <SectionLabel>Chips and tags</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <Chip selected>Guitar</Chip>
              <Chip>Bass</Chip>
              <Chip>Drums</Chip>
              <Chip>Vocals</Chip>
            </div>
            <div className="flex flex-wrap gap-2 text-footnote">
              <span className="px-3 py-1.5 rounded-full bg-gel-blue/15 text-gel-blue font-medium">Joining a band</span>
              <span className="px-3 py-1.5 rounded-full bg-gel-pink/15 text-gel-pink font-medium">Co-writing</span>
              <span className="px-3 py-1.5 rounded-full bg-gel-teal/15 text-gel-teal font-semibold eyebrow">Now</span>
              <span className="px-3 py-1.5 rounded-full bg-tungsten/15 text-tungsten font-medium">Open spot</span>
            </div>
            <SectionLabel>Chat bubbles</SectionLabel>
            <div className="flex flex-col gap-2">
              <div className="self-start max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_20px_6px] bg-stage text-callout">Want to come play Thursday?</div>
              <div className="self-end max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_6px_20px] bubble-own text-callout">I&apos;m in. Sending you a demo first.</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <SectionLabel>Board post card: pick the cover under &ldquo;Try a look&rdquo; above</SectionLabel>
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {SAMPLE_POSTS.map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="motion" title="Motion" intro="One physical feel everywhere. Things arrive on a spring, leave quickly, and never block a tap. Press a curve to play it. With Reduce Motion on, everything cross-fades instead.">
        <MotionLab />
      </Section>

      <Section id="haptics" title="Haptics" intro="Paired with motion, never on their own. Native Taptic Engine in the iPhone app, a short vibration on Android, the system tick in iPhone Safari.">
        <ul className="grid sm:grid-cols-2 md:grid-cols-5 gap-3">
          <HapticRow kind="tap" use="A button or card was pressed" />
          <HapticRow kind="select" use="A chip, tab or toggle changed" />
          <HapticRow kind="success" use="Connect landed, post went up" />
          <HapticRow kind="warning" use="Blocked, needs another look" />
          <HapticRow kind="heavy" use="A drag passed the point of no return" />
        </ul>
      </Section>
    </main>
  );
}
