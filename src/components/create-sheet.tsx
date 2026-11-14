"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDraft } from "@/lib/onboarding";
import { SharePage } from "./share-page";

type Action = { id: string; href?: string; title: string; sub: string; hue: string; icon: React.ReactNode };

const ACTIONS: Action[] = [
  {
    id: "post",
    href: "/board/new",
    title: "Looking for someone",
    sub: "Post a role, a gig or a jam to the Board",
    hue: "#FFB245",
    icon: (
      <>
        <rect x="3.5" y="6.5" width="17" height="13.5" rx="2.5" />
        <path d="M12 6.5V4M7.5 11.5h5M7.5 15.5h9" />
      </>
    ),
  },
  {
    id: "song",
    href: "/onboarding/sound",
    title: "Add a song or clip",
    sub: "New release, old demo, a 30-second take",
    hue: "#FFACBA",
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
    href: "/me/projects",
    title: "Add a band or project",
    sub: "Your journey, old bands too. Bandmates confirm.",
    hue: "#B5C5FF",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    id: "share",
    title: "Share my page",
    sub: "Story card, link, or your band's group chat",
    hue: "#67E2DA",
    icon: (
      <>
        <path d="M12 3v12M7 8l5-5 5 5" />
        <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
      </>
    ),
  },
  {
    id: "invite",
    href: "/me/projects",
    title: "Invite a bandmate",
    sub: "Tag them on a band so they confirm your spot",
    hue: "#F7BF77",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.4" />
        <path d="M3 20c.6-3.6 3-5.6 6-5.6s5.4 2 6 5.6M19 8v6M16 11h6" />
      </>
    ),
  },
];

/** The + button's sheet: one tap to the things that make your page worth visiting. */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { draft } = useDraft();
  const [sharing, setSharing] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const username = draft.username.replace(/^@/, "");

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="create-title">
          <button type="button" aria-label="Close" onClick={onClose} className="sheet-scrim absolute inset-0 bg-ink/70 backdrop-blur-sm" />
          <div className="sheet-up relative w-full md:max-w-[460px] rounded-t-[32px] md:rounded-[32px] bg-stage border border-paper/10 px-4 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-1.5">
            <span aria-hidden="true" className="md:hidden self-center w-10 h-[5px] rounded-full bg-paper/25 mb-2" />
            <h2 id="create-title" className="px-1 pb-2 font-display text-[24px] font-bold tracking-[-0.02em]">
              What are you up to?
            </h2>
            {ACTIONS.map((a, i) => {
              const body = (
                <>
                  <span
                    className="size-12 rounded-[15px] flex items-center justify-center shrink-0"
                    style={i === 0 ? { background: a.hue, color: "#0F0D0B" } : { background: `color-mix(in srgb, ${a.hue} 16%, transparent)`, color: a.hue }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {a.icon}
                    </svg>
                  </span>
                  <span className="flex flex-col gap-0.5 text-left">
                    <span className="text-[16px] font-semibold">{a.title}</span>
                    <span className="text-[13px] text-smoke">{a.sub}</span>
                  </span>
                </>
              );
              const cls = "flex items-center gap-3.5 p-3 rounded-[20px] transition hover:bg-paper/6 active:scale-[0.99]";
              if (!a.href) {
                return (
                  <button
                    key={a.id}
                    type="button"
                    disabled={!username}
                    onClick={() => {
                      onClose();
                      setSharing(true);
                    }}
                    className={`${cls} disabled:opacity-50`}
                  >
                    {body}
                  </button>
                );
              }
              return (
                <Link key={a.id} href={a.href} onClick={onClose} className={cls} style={i === 0 ? { background: `color-mix(in srgb, ${a.hue} 12%, transparent)` } : undefined}>
                  {body}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {sharing && username && origin && (
        <SharePage username={username} firstName={draft.firstName} mine url={`${origin}/@${username}`} openNow onClose={() => setSharing(false)} />
      )}
    </>
  );
}
