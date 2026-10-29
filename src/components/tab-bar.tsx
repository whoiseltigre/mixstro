"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cx } from "./ui";

const TABS = [
  {
    href: "/discover",
    label: "Today",
    // The Mixstro diamond and waveform as a line icon. "Today", not "Matches": no dating language.
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
const UNREAD = isSupabaseConfigured ? 0 : 2;

export function TabBar() {
  const path = usePathname();
  // Full-screen moments (profiles, a conversation, a new connection, search) hide the tab bar.
  if (/^\/(m|connected)\/|^\/messages\/.+|^\/search/.test(path)) return null;

  return (
    <div className="fixed z-20 left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom),16px)] flex gap-2.5">
      <nav aria-label="Main" className="glass w-[286px] h-[62px] rounded-[31px] flex items-center px-[5px]">
        {TABS.map((t) => {
          const active = path === t.href || path.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex-1 h-[52px] rounded-[26px] flex flex-col items-center justify-center gap-[3px] text-[10px] font-semibold transition",
                active ? "bg-paper/12 text-paper" : "text-smoke",
              )}
            >
              {t.href === "/messages" && UNREAD > 0 && (
                <span aria-label={`${UNREAD} unread`} className="absolute top-[5px] right-[14px] min-w-4 h-4 px-1 rounded-full bg-paper text-ink text-[10px] font-bold flex items-center justify-center">
                  {UNREAD}
                </span>
              )}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                {t.icon}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/search" aria-label="Search" className="glass size-[62px] rounded-full flex items-center justify-center text-paper">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </Link>
    </div>
  );
}
