"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SharePage, hasSharedPage } from "@/components/share-page";
import { ChevronRight, CheckIcon } from "@/components/ui";
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
      <h1 className="headline text-[30px] md:text-[44px] truncate">
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
 * Right after signup: what makes your page worth sharing, in order, ending with sharing it.
 * Once it's all done (or hidden) it shrinks to a one-line nudge to share.
 */
export function YourStage({ stage }: { stage: Stage }) {
  const [shared, setShared] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sharing, setSharing] = useState(false);
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
  // The first open step is the one to do now: it gets the color.
  const nextId = steps.find((s) => !s.done)?.id;

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
        <div className="relative mx-5 md:mx-0 p-4 rounded-[22px] border border-[#67E2DA]/35 flex items-center gap-3.5" style={{ background: "linear-gradient(135deg, rgb(103 226 218 / 0.16), rgb(181 197 255 / 0.1))" }}>
          <Avatar stage={stage} size={52} />
          <span className="flex-1 flex flex-col gap-0.5 min-w-0">
            <span className="text-[15px] font-semibold">Your page is ready to share</span>
            <span className="text-[13px] text-paper/75 text-pretty">Post it in your band&apos;s group chat or a local musicians group.</span>
          </span>
          <button type="button" onClick={share} className="h-10 px-4 rounded-full bg-[#67E2DA] text-ink text-[14px] font-semibold shrink-0">
            Share
          </button>
        </div>
        {sheet}
      </>
    );
  }

  return (
    <section aria-labelledby="your-stage" className="relative mx-5 md:mx-0 flex flex-col gap-3.5 md:max-w-[720px]">
      <div className="flex items-center justify-between">
        <span id="your-stage" className="text-[13px] font-semibold tracking-[0.14em] uppercase text-tungsten">
          Your stage
        </span>
        <span className="text-[13px] text-smoke">
          {done} of {total} done
        </span>
      </div>
      <h2 className="font-display text-[26px] md:text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-pretty">
        Your page is live. Make it worth sharing.
      </h2>

      <Link href={`/@${stage.username}`} className="flex items-center gap-3.5 p-3 rounded-[22px] bg-stage border border-paper/8 transition hover:border-paper/30">
        <Avatar stage={stage} size={64} />
        <span className="flex-1 flex flex-col gap-0.5 min-w-0">
          <span className="text-[17px] font-semibold truncate">{stage.firstName}</span>
          {stage.headline && <span className="text-[13px] text-smoke truncate">{stage.headline}</span>}
          <span className="text-[12.5px] text-tungsten truncate">app.mixstro.com/@{stage.username}</span>
        </span>
        <span className="h-9 px-3.5 rounded-full bg-paper/10 text-[13px] font-semibold flex items-center shrink-0">View</span>
      </Link>

      <div className="h-1.5 rounded-full bg-paper/10 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Your stage progress">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#F7BF77,#FFACBA)] transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <ul className="flex flex-col gap-2">
        {steps
          .filter((s) => !s.done)
          .map((s) => {
            const now = s.id === nextId;
            const inner = (
              <>
                <span
                  className="size-11 rounded-[14px] flex items-center justify-center shrink-0"
                  style={now ? { background: s.hue, color: "#0F0D0B" } : { background: `color-mix(in srgb, ${s.hue} 16%, transparent)`, color: s.hue }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {s.icon}
                  </svg>
                </span>
                <span className="flex-1 flex flex-col gap-0.5 text-left">
                  <span className="text-[15.5px] font-semibold">{s.title}</span>
                  <span className={now ? "text-[13px] leading-snug text-paper/75" : "text-[13px] leading-snug text-smoke"}>{s.sub}</span>
                </span>
                <ChevronRight />
              </>
            );
            const cls = "w-full flex items-center gap-3 p-3.5 rounded-[20px] transition";
            const style = now
              ? { background: `linear-gradient(135deg, color-mix(in srgb, ${s.hue} 20%, transparent), rgb(255 172 186 / 0.1))`, border: `1.5px solid color-mix(in srgb, ${s.hue} 55%, transparent)` }
              : { background: "var(--color-stage)", border: "1px solid rgb(245 241 236 / 0.08)" };
            return (
              <li key={s.id}>
                {s.href ? (
                  <Link href={s.href} className={cls} style={style}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" onClick={share} className={cls} style={style}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        {steps
          .filter((s) => s.done)
          .concat({ id: "signup", done: true, title: "Instruments, sound and influences", sub: "", hue: "", icon: null })
          .map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3.5 py-1.5 text-[14px] text-smoke">
              <span className="size-[22px] rounded-full bg-tungsten text-ink flex items-center justify-center shrink-0">
                <CheckIcon size={12} />
              </span>
              <span className="line-through decoration-paper/30">{s.title}</span>
            </li>
          ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(HIDE_KEY, "1");
          } catch {}
        }}
        className="self-center h-11 px-4 text-[14px] font-medium text-smoke hover:text-paper"
      >
        Hide for now
      </button>
      {sheet}
    </section>
  );
}

function Avatar({ stage, size }: { stage: Stage; size: number }) {
  return stage.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={stage.photo} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-[18px] object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-[18px] bg-riser flex items-center justify-center font-display font-bold text-[22px] shrink-0" style={{ width: size, height: size }}>
      {stage.firstName[0]?.toUpperCase()}
    </span>
  );
}
