"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const TABS = [
  {
    href: "/discover",
    label: "Matches",
    // Two stacked cards: today's curated matches.
    icon: (
      <>
        <rect x="6" y="3.5" width="12" height="16" rx="2.5" />
        <path d="M3.5 7.5v10a3 3 0 0 0 3 3h9" />
      </>
    ),
  },
  {
    href: "/board",
    label: "Board",
    // A pinned notice: "looking for" posts.
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <circle cx="12" cy="5" r="1.8" fill="currentColor" />
        <path d="M8 11h8M8 15h5" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" strokeLinejoin="round" />,
  },
  {
    href: "/me",
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.8" />
        <path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" />
      </>
    ),
  },
];

export function TabBar() {
  const path = usePathname();
  // Full-screen moments (profiles, a conversation, a new connection) hide the tab bar.
  if (/^\/(m|connected)\/|^\/messages\/.+/.test(path)) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed z-20 left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom),16px)] glass h-[62px] rounded-[31px] flex items-center gap-0.5 px-1.5"
    >
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "w-[74px] h-[52px] rounded-[26px] flex flex-col items-center justify-center gap-0.5 transition",
              active ? "bg-paper/14 text-paper" : "text-smoke",
            )}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              {t.icon}
            </svg>
            <span className="text-[10px] font-semibold tracking-[0.01em]">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
