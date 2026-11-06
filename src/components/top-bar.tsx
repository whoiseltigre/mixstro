"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDraft } from "@/lib/onboarding";
import { TABS, UNREAD } from "./tab-bar";
import { Wordmark, cx } from "./ui";

// Each tab's stage-spill color, the same gels the phone screens use.
const GLOW: Record<string, string> = { "/discover": "#FFB245", "/board": "#B5C5FF", "/messages": "#67E2DA", "/me": "#F7BF77" };

/** Tablet and desktop navigation: the phone's glass tab bar, moved to the top. Hidden below 768px. */
export function TopBar() {
  const path = usePathname();
  const { draft } = useDraft();
  const tab = TABS.find((t) => path === t.href || path.startsWith(t.href + "/"));
  const glow = GLOW[tab?.href ?? ""] ?? "#FFB245";

  return (
    <>
      <div
        aria-hidden="true"
        className="hidden md:block pointer-events-none fixed inset-x-0 top-0 h-[520px] -z-10 transition-[background] duration-500"
        style={{ background: `radial-gradient(45% 60% at 50% 0%, ${glow}40, transparent)` }}
      />
      <header className="hidden md:flex fixed inset-x-0 top-0 z-30 pt-safe">
        <div className="w-full max-w-[1440px] mx-auto h-[88px] px-10 flex items-center justify-between gap-6">
          <Link href="/discover" aria-label="Mixstro, Today" className="shrink-0 lg:w-[160px]">
            <Wordmark size={24} />
          </Link>
          <nav aria-label="Main" className="glass rounded-full p-[5px] flex gap-1">
            {TABS.map((t) => {
              const active = tab?.href === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "h-10 px-5 rounded-full flex items-center gap-2 text-[14px] transition",
                    active ? "bg-paper text-ink font-semibold" : "text-smoke hover:text-paper",
                  )}
                >
                  {t.label}
                  {t.href === "/messages" && UNREAD > 0 && !active && (
                    <span aria-label={`${UNREAD} unread`} className="min-w-5 h-5 px-1.5 rounded-full bg-paper text-ink text-[11px] font-bold flex items-center justify-center">
                      {UNREAD}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="shrink-0 lg:w-[160px] flex items-center justify-end gap-2.5">
            <Link href="/search" aria-label="Search" className="glass size-11 rounded-full flex items-center justify-center hover:bg-paper/10 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
            </Link>
            <Link href="/settings" aria-label="Settings" className="size-11 rounded-full overflow-hidden bg-riser border border-paper/12 flex items-center justify-center text-[15px] font-semibold">
              {draft.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
              ) : (
                (draft.firstName[0] ?? "").toUpperCase()
              )}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
