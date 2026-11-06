"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PersonPhoto } from "@/components/person-photo";
import type { RoleAlert } from "@/lib/people";

const KEY = "mixstro:role-alert-dismissed";

/** Plays "Drums" → "drummer" for the alert line. */
const NOUN: Record<string, string> = {
  Drums: "drummer",
  Bass: "bassist",
  Guitar: "guitarist",
  Keys: "keys player",
  Vocals: "singer",
  Producer: "producer",
  Songwriter: "songwriter",
  DJ: "DJ",
  Strings: "string player",
  Horns: "horn player",
};

/** #12 A one-at-a-time card at the top of Today when a musician you're looking for joins nearby. */
export function RoleAlertCard({ alert }: { alert: RoleAlert }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === alert.person.id);
    } catch {
      setHidden(false);
    }
  }, [alert.person.id]);
  if (hidden) return null;

  const m = alert.person;
  const noun = NOUN[alert.role] ?? alert.role.toLowerCase();
  return (
    <div className="fixed z-30 left-1/2 -translate-x-1/2 top-[calc(max(env(safe-area-inset-top),12px)+52px)] md:top-[96px] w-[calc(100%-32px)] max-w-[440px] glass rounded-[22px] p-2.5 pr-2 flex items-center gap-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)]">
      <span className="relative size-11 rounded-full overflow-hidden shrink-0">
        <PersonPhoto person={m} sizes="44px" initialsSize={16} />
      </span>
      <Link href={`/m/${m.username}`} className="flex-1 min-w-0 flex flex-col">
        <span className="text-[14px] font-semibold leading-tight">
          A {noun} {alert.why} just joined
        </span>
        <span className="text-[13px] text-smoke truncate">
          {m.name} · {m.distanceMi} mi away
        </span>
      </Link>
      <Link href={`/m/${m.username}`} className="h-9 px-3.5 rounded-full bg-paper text-ink text-[13px] font-semibold flex items-center shrink-0">
        See {m.name.split(" ")[0]}
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, m.id);
          } catch {
            // Private mode: it just comes back next visit.
          }
        }}
        className="size-8 rounded-full flex items-center justify-center text-smoke hover:text-paper shrink-0"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
