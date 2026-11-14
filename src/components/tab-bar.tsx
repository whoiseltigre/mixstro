"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CreateSheet } from "./create-sheet";
import { cx } from "./ui";

export const TABS = [
  {
    href: "/discover",
    label: "Home",
    // The Mixstro diamond and waveform as a line icon. No dating language anywhere ("Matches").
    icon: (
      <>
        <path d="M12 2.8L21.2 12 12 21.2 2.8 12z" />
        <path d="M6.6 12h2.1l1.4-2.4 2.2 5 1.5-2.6h3.6" />
      </>
    ),
  },
  {
    href: "/board",
    label: "Board",
    // A pinned notice, like the flyer wall at a rehearsal space.
    icon: (
      <>
        <rect x="3.5" y="6.5" width="17" height="13.5" rx="2.5" />
        <path d="M12 6.5V4" />
        <circle cx="12" cy="3.2" r="1.2" />
        <path d="M7.5 11.5h5M7.5 15.5h9" />
      </>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: (
      <>
        <path d="M4 4.5h10.5A1.5 1.5 0 0116 6v6.5a1.5 1.5 0 01-1.5 1.5H9l-3.5 3v-3H4a1.5 1.5 0 01-1.5-1.5V6A1.5 1.5 0 014 4.5z" />
        <path d="M19 8.5h.5A1.5 1.5 0 0121 10v6.5a1.5 1.5 0 01-1.5 1.5H19v3l-3.5-3H11" />
      </>
    ),
  },
  {
    href: "/me",
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="10.5" r="3" />
        <path d="M6.5 18c1.2-2.3 3.2-3.5 5.5-3.5s4.3 1.2 5.5 3.5" />
      </>
    ),
  },
];

// Sample badge in demo mode. TODO: count threads waiting on you once read state is tracked.
export const UNREAD = isSupabaseConfigured ? 0 : 2;

export function TabBar() {
  const path = usePathname();
  const [creating, setCreating] = useState(false);
  // Full-screen moments (profiles, a conversation, a new connection, search) hide the tab bar.
  if (/^\/(m|connected)\/|^\/messages\/.+|^\/search/.test(path)) return null;

  const tab = (t: (typeof TABS)[number]) => {
    const active = path === t.href || path.startsWith(t.href + "/");
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "relative h-16 rounded-[32px] flex flex-col items-center justify-center gap-1 text-[12px] font-semibold transition active:scale-95",
          active ? "bg-paper/12 text-paper" : "text-smoke",
        )}
      >
        {t.href === "/messages" && UNREAD > 0 && (
          <span aria-label={`${UNREAD} unread`} className="absolute top-1.5 right-[calc(50%-24px)] min-w-[18px] h-[18px] px-1 rounded-full bg-paper text-ink text-[11px] font-bold flex items-center justify-center">
            {UNREAD}
          </span>
        )}
        <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          {t.icon}
        </svg>
        {t.label}
      </Link>
    );
  };

  return (
    <>
      {/* Phones: one full-width glass bar, big targets, and a bright + in the middle so there's always a next move. */}
      <nav
        aria-label="Main"
        className="md:hidden fixed z-20 left-3 right-3 bottom-[max(env(safe-area-inset-bottom),14px)] mx-auto max-w-[536px] h-[76px] rounded-[38px] glass grid grid-cols-5 items-center px-1.5 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.8)]"
      >
        {TABS.slice(0, 2).map(tab)}
        <button
          type="button"
          aria-label="Create"
          aria-haspopup="dialog"
          onClick={() => setCreating(true)}
          className="justify-self-center size-[58px] rounded-full bg-tungsten text-ink flex items-center justify-center shadow-[0_8px_22px_-8px_#FFB245] transition active:scale-90"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        {TABS.slice(2).map(tab)}
      </nav>
      <CreateSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
