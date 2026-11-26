"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SharePage, hasSharedPage } from "@/components/share-page";
import { ChevronRight, buttonClass } from "@/components/ui";
import type { Stage } from "@/lib/people";
import { useDraft } from "@/lib/onboarding";

/** "Evening, Sundy" and search, where people look for it. */
export function HomeHeader() {
  const { draft } = useDraft();
  const [part, setPart] = useState("Hey");
  useEffect(() => {
    const h = new Date().getHours();
    setPart(h < 5 ? "Hey" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening");
  }, []);
  return (
    <div className="relative mt-3 md:mt-0 px-5 md:px-0 flex items-center justify-between gap-4">
      <h1 className="headline text-display-sm md:text-display-lg truncate">
        {part}
        {draft.firstName ? `, ${draft.firstName}` : ""}
      </h1>
      <Link
        href="/search"
        aria-label="Search musicians"
        className="md:hidden glass size-12 rounded-full flex items-center justify-center shrink-0"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </Link>
    </div>
  );
}

const HIDE_KEY = "mx_stage_hidden";

type Step = { id: string; done: boolean; title: string; sub: string; hue: string; href?: string; icon: React.ReactNode };

/**
 * What makes your page worth sharing, as one slim row on Home: a progress ring, the next step,
 * and the rest a tap away. Home leads with people; this never pushes them down the screen.
 * Once it's all done (or hidden) it becomes a one-line nudge to share.
 */
export function YourStage({ stage }: { stage: Stage }) {
  const [shared, setShared] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setShared(hasSharedPage());
    setOrigin(window.location.origin);
    try {
      setHidden(localStorage.getItem(HIDE_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  const url = `${origin}/@${stage.username}`;
  const steps: Step[] = [
    {
      id: "song",
      done: stage.hasSong,
      href: "/onboarding/sound",
      title: "Add a song",
      sub: "Musicians hear you before they reply. Paste a link or record 30 seconds.",
      hue: "#FFB245",
      icon: (
        <>
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
        </>
      ),
    },
    {
      id: "project",
      done: stage.hasProject,
      href: "/me/projects",
      title: "Add a band or past project",
      sub: "Your musical journey, old songs included. Tag bandmates to confirm.",
      hue: "#B5C5FF",
      icon: (
        <>
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <path d="M8 6V4h8v2" />
        </>
      ),
    },
    {
      id: "photo",
      done: stage.hasPhoto,
      href: "/me",
      title: "Add a photo",
      sub: "A real photo, ideally with your instrument.",
      hue: "#FFACBA",
      icon: (
        <>
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M9 6l1.5-2h3L15 6" />
        </>
      ),
    },
    {
      id: "share",
      done: shared,
      title: "Share your page",
      sub: "A story card for Instagram, a link for your band chat.",
      hue: "#67E2DA",
      icon: (
        <>
          <path d="M12 3v12M7 8l5-5 5 5" />
          <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
        </>
      ),
    },
  ];
  const done = steps.filter((s) => s.done).length + 1; // + the signup itself
  const total = steps.length + 1;
  const complete = done === total;

  const share = () => setSharing(true);
  const sheet = sharing && origin && (
    <SharePage
      username={stage.username}
      firstName={stage.firstName}
      mine
      url={url}
      openNow
      onClose={() => {
        setSharing(false);
        setShared(true);
      }}
    />
  );

  if (complete || hidden) {
    return (
      <>
        <div className="relative mx-5 md:mx-0 p-3 rounded-card-lg bg-stage border border-paper/8 flex items-center gap-3.5">
          <Avatar stage={stage} size={44} />
          <span className="flex-1 flex flex-col min-w-0">
            <span className="text-callout font-semibold">Your page is ready to share</span>
            <span className="text-footnote text-smoke truncate">Drop it in your band&apos;s group chat.</span>
          </span>
          <button type="button" onClick={share} className={buttonClass("glass", "sm", "shrink-0")}>
            Share
          </button>
        </div>
        {sheet}
      </>
    );
  }

  const next = steps.find((s) => !s.done)!;
  const open = steps.filter((s) => !s.done);

  return (
    <section aria-labelledby="your-stage" className="relative mx-5 md:mx-0 rounded-card-lg bg-stage border border-paper/8 overflow-hidden">
      <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} aria-controls="your-stage-steps" className="w-full min-h-[68px] p-3 flex items-center gap-3.5 text-left">
        <Ring done={done} total={total}>
          <Avatar stage={stage} size={40} round />
        </Ring>
        <span className="flex-1 flex flex-col min-w-0">
          <span id="your-stage" className="text-callout font-semibold truncate">
            Your page: {done} of {total} done
          </span>
          <span className="text-footnote text-smoke truncate">Next: {next.title.toLowerCase()}</span>
        </span>
        <span className={`size-11 flex items-center justify-center text-smoke transition-transform duration-300 ${expanded ? "rotate-90" : ""}`} aria-hidden="true">
          <ChevronRight />
        </span>
      </button>

      {expanded && (
        <ul id="your-stage-steps" className="border-t border-paper/8 flex flex-col">
          {open.map((s) => {
            const inner = (
              <>
                <span className="size-10 rounded-field flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${s.hue} 16%, transparent)`, color: s.hue }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {s.icon}
                  </svg>
                </span>
                <span className="flex-1 flex flex-col gap-0.5 text-left min-w-0">
                  <span className="text-callout font-semibold">{s.title}</span>
                  <span className="text-footnote leading-snug text-smoke text-pretty">{s.sub}</span>
                </span>
                <ChevronRight />
              </>
            );
            const cls = "w-full flex items-center gap-3 px-3 py-3 transition hover:bg-paper/5";
            return (
              <li key={s.id} className="border-b border-paper/8 last:border-b-0">
                {s.href ? (
                  <Link href={s.href} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" onClick={share} className={cls}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
          <li className="flex items-center justify-between gap-3 pl-3 pr-1">
            <Link href={`/@${stage.username}`} className="h-11 flex items-center text-subhead font-semibold text-paper">
              See your page
            </Link>
            <button
              type="button"
              onClick={() => {
                setHidden(true);
                try {
                  localStorage.setItem(HIDE_KEY, "1");
                } catch {}
              }}
              className="h-11 px-3 text-subhead font-medium text-smoke hover:text-paper"
            >
              Hide this
            </button>
          </li>
        </ul>
      )}
      {sheet}
    </section>
  );
}

/** Progress as a ring around your photo: quiet, and it fills as the page does. */
function Ring({ done, total, children }: { done: number; total: number; children: React.ReactNode }) {
  const pct = Math.round((done / total) * 100);
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label="Your page progress"
      className="size-12 rounded-full flex items-center justify-center shrink-0"
      style={{ background: `conic-gradient(var(--color-gel-peach) ${pct}%, rgb(245 241 236 / 0.12) 0)` }}
    >
      <span className="size-[44px] rounded-full bg-stage flex items-center justify-center">{children}</span>
    </span>
  );
}

function Avatar({ stage, size, round }: { stage: Stage; size: number; round?: boolean }) {
  const shape = round ? "rounded-full" : "rounded-tile";
  return stage.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={stage.photo} alt="" width={size} height={size} referrerPolicy="no-referrer" className={`${shape} object-cover shrink-0`} style={{ width: size, height: size }} />
  ) : (
    <span className={`${shape} bg-riser flex items-center justify-center font-display font-semibold text-body-lg shrink-0`} style={{ width: size, height: size }}>
      {stage.firstName[0]?.toUpperCase()}
    </span>
  );
}
