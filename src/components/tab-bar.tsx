"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isNativeApp, mixstroNative } from "@/lib/native";
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

// Full-screen moments (profiles, a conversation, a new connection, search, making something) hide the tab bar.
const FULL_SCREEN = /^\/(m|connected)\/|^\/messages\/.+|^\/search|^\/board\/new|^\/me\/(projects|highlights)/;

export function TabBar() {
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(null);
  const path = usePathname();
  const [creating, setCreating] = useState(false);
  const native = useNativeTabBar(path, creating, () => setCreating(true));
  if (native) return <CreateSheet open={creating} onClose={() => setCreating(false)} />;
  if (FULL_SCREEN.test(path)) return null;

  // The pill moves the moment a tab is tapped, not when the next screen has loaded.
  const current = TABS.findIndex((t) => path === t.href || path.startsWith(t.href + "/"));
  const lit = tapped && tapped.from === path ? tapped.index : current;
  // Five columns: two tabs, Create, two tabs.
  const column = lit < 0 ? -1 : lit < 2 ? lit : lit + 1;

  const tab = (t: (typeof TABS)[number], i: number) => {
    const active = i === lit;
    return (
      <Link
        key={t.href}
        href={t.href}
        data-haptic="select"
        onClick={() => setTapped({ index: i, from: path })}
        aria-current={i === current ? "page" : undefined}
        className={cx(
          "press relative z-10 h-16 rounded-hero flex flex-col items-center justify-center gap-1 text-caption font-semibold",
          active ? "text-paper" : "text-paper/70",
        )}
      >
        {t.href === "/messages" && UNREAD > 0 && (
          <span aria-label={`${UNREAD} unread`} className="absolute top-1.5 right-[calc(50%-24px)] min-w-[18px] h-[18px] px-1 rounded-full bg-paper text-ink text-caption2 font-bold flex items-center justify-center">
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
        className="md:hidden fixed z-20 left-3 right-3 bottom-[max(env(safe-area-inset-bottom),14px)] mx-auto max-w-[536px] h-[76px] rounded-[38px] glass-thick grid grid-cols-5 items-center px-1.5 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.8)]"
      >
        {/* One glass pill that slides to the lit tab on the snappy spring. */}
        <span
          aria-hidden="true"
          className="absolute left-1.5 top-1.5 h-16 rounded-hero bg-paper/12 transition-[translate,opacity] duration-(--duration-spring) ease-spring-snappy"
          style={{ width: "calc((100% - 12px) / 5)", translate: `${Math.max(column, 0) * 100}% 0`, opacity: column < 0 ? 0 : 1 }}
        />
        {TABS.slice(0, 2).map((t, i) => tab(t, i))}
        <button
          type="button"
          aria-label="Create"
          aria-haspopup="dialog"
          onClick={() => setCreating(true)}
          className="justify-self-center size-[58px] rounded-full bg-tungsten text-ink flex items-center justify-center shadow-spotlight transition active:scale-90"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        {TABS.slice(2).map((t, i) => tab(t, i + 2))}
      </nav>
      <CreateSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

/**
 * In the iPhone app the tab bar is a real iOS one (MixstroNativePlugin.swift): this keeps its
 * active tab, visibility and badge in step with the page, and turns its taps into navigation.
 * Returns true when the native bar is in charge, so the web bar isn't drawn.
 */
function useNativeTabBar(path: string, creating: boolean, onCreate: () => void) {
  const router = useRouter();
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp() && Boolean(mixstroNative())), []);

  useEffect(() => {
    if (!native) return;
    const active = TABS.find((t) => path === t.href || path.startsWith(t.href + "/"))?.href ?? null;
    const chat = /^\/messages\/.+/.test(path);
    // The Create sheet sits where the bar is, so the bar steps aside while it's open; closing
    // it puts the bar back with the page's own tab selected (not "Create").
    mixstroNative()?.updateChrome({ visible: !FULL_SCREEN.test(path) && !creating, active, badge: UNREAD, refresh: !chat }).catch(() => {});
  }, [native, path, creating]);

  useEffect(() => {
    const n = native ? mixstroNative() : null;
    if (!n) return;
    const subs = [
      n.addListener("tabSelect", ({ href }) => {
        if (!href) return;
        // Tapping the tab you're on scrolls to the top (or back to the tab's first screen).
        if (location.pathname === href) window.scrollTo({ top: 0, behavior: "smooth" });
        else router.push(href);
      }),
      n.addListener("create", onCreate),
    ];
    return () => {
      subs.forEach((s) => s.then((l) => l.remove()).catch(() => {}));
      // Leaving the app's tabbed screens (sign out, a public page): hide the bar.
      n.updateChrome({ visible: false }).catch(() => {});
    };
    // onCreate only opens the sheet; a stale copy is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native, router]);

  return native;
}
