"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logEvent } from "@/app/(app)/pmf-actions";
import type { GetStarted } from "@/lib/get-started";
import { CheckIcon, ChevronRight } from "./ui";

const KEY = "mixstro:get-started-hidden-until";
const DAY = 24 * 60 * 60 * 1000;

/**
 * A small glass card at the top of Today for your first two weeks: three steps that
 * lead to a first real conversation. Tap to open; the X hides it for a day.
 */
export function GetStartedCard({ state }: { state: GetStarted }) {
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setHidden(Number(localStorage.getItem(KEY) ?? 0) > Date.now());
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;

  const next = state.steps.find((s) => !s.done)!;
  const total = state.steps.length;

  return (
    <div className="fixed z-30 left-1/2 -translate-x-1/2 top-[calc(max(env(safe-area-inset-top),12px)+52px)] md:top-[96px] w-[calc(100%-32px)] max-w-[440px] glass rounded-[22px] shadow-[0_12px_40px_rgb(0_0_0/0.45)] overflow-hidden">
      <div className="flex items-center gap-3 p-2.5 pr-2">
        <Ring done={state.done} total={total} />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            if (!open) logEvent("get_started_opened");
            setOpen(!open);
          }}
          className="flex-1 min-w-0 flex flex-col text-left"
        >
          <span className="text-[14px] font-semibold leading-tight">Get started · {state.done} of {total}</span>
          <span className="text-[13px] text-smoke truncate">Next: {next.title}</span>
        </button>
        {!open && (
          <Link href={next.href} className="h-9 px-3.5 rounded-full bg-paper text-ink text-[13px] font-semibold flex items-center shrink-0">
            Go
          </Link>
        )}
        <button
          type="button"
          aria-label="Hide for today"
          onClick={() => {
            setHidden(true);
            logEvent("get_started_dismissed");
            try {
              localStorage.setItem(KEY, String(Date.now() + DAY));
            } catch {}
          }}
          className="size-9 rounded-full flex items-center justify-center text-smoke hover:text-paper shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      {open && (
        <ol className="flex flex-col px-2.5 pb-2.5 gap-1.5">
          {state.steps.map((s) => (
            <li key={s.id}>
              <Link
                href={s.href}
                className={`flex items-center gap-3 p-3 rounded-[16px] transition ${s.done ? "opacity-55" : "bg-ink/50 hover:bg-ink/70"}`}
              >
                <span
                  className={`size-6 rounded-full shrink-0 flex items-center justify-center ${s.done ? "bg-tungsten text-ink" : "border border-paper/30"}`}
                  aria-hidden="true"
                >
                  {s.done && <CheckIcon size={13} />}
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className={`text-[14px] font-semibold ${s.done ? "line-through decoration-paper/40" : ""}`}>{s.title}</span>
                  {!s.done && <span className="text-[12.5px] text-smoke text-pretty">{s.sub}</span>}
                </span>
                {!s.done && <ChevronRight size={16} />}
                <span className="sr-only">{s.done ? "Done" : "Not done yet"}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** A tungsten progress ring with the count inside. */
function Ring({ done, total }: { done: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative size-11 shrink-0" aria-hidden="true">
      <svg viewBox="0 0 44 44" className="size-11 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(245 241 236 / 0.14)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="#FFB245" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold">{done}/{total}</span>
    </span>
  );
}
