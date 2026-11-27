"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDraft } from "@/lib/onboarding";
import { SharePage } from "./share-page";
import { Sheet } from "./sheet";
import { COLOR, GEL } from "@/lib/tokens";

type Action = { id: string; href?: string; title: string; sub: string; hue: string; icon: React.ReactNode };

const ACTIONS: Action[] = [
  {
    id: "post",
    href: "/board/new",
    title: "Looking for someone",
    sub: "Post a role, a gig or a jam to the Board",
    hue: COLOR.tungsten,
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
    hue: GEL.pink,
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
    hue: GEL.blue,
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
    hue: GEL.teal,
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
    hue: GEL.peach,
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

  const username = draft.username.replace(/^@/, "");

  return (
    <>
      {open && (
        <Sheet
          onClose={onClose}
          labelledBy="create-title"
          handle={false}
          scrimClassName="bg-ink/70 backdrop-blur-sm"
          className="md:max-w-[460px] rounded-t-hero md:rounded-hero bg-stage border border-paper/10 px-4 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-1.5"
        >
            <span aria-hidden="true" className="md:hidden self-center w-10 h-[5px] rounded-full bg-paper/25 mb-2" />
            <h2 id="create-title" className="px-1 pb-2 headline text-title1">
              What are you up to?
            </h2>
            {ACTIONS.map((a, i) => {
              const body = (
                <>
                  <span
                    className="size-12 rounded-field flex items-center justify-center shrink-0"
                    style={i === 0 ? { background: a.hue, color: "#0F0D0B" } : { background: `color-mix(in srgb, ${a.hue} 16%, transparent)`, color: a.hue }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {a.icon}
                    </svg>
                  </span>
                  <span className="flex flex-col gap-0.5 text-left">
                    <span className="text-body font-semibold">{a.title}</span>
                    <span className="text-footnote text-smoke">{a.sub}</span>
                  </span>
                </>
              );
              const cls = "press flex items-center gap-3.5 p-3 rounded-card hover:bg-paper/6";
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
        </Sheet>
      )}
      {sharing && username && origin && (
        <SharePage username={username} firstName={draft.firstName} mine url={`${origin}/@${username}`} openNow onClose={() => setSharing(false)} />
      )}
    </>
  );
}
