"use client";

import Link from "next/link";
import { CheckIcon, cx } from "./ui";

/** "I'm 18 or older" consent box. Self-confirmed, like a typed birthday would be, but one tap instead of a date picker. */
export function AdultCheck({ checked, onChange, nudge }: { checked: boolean; onChange: (on: boolean) => void; nudge?: boolean }) {
  return (
    <label
      className={cx(
        "flex items-start gap-3 cursor-pointer rounded-2xl px-3 py-2.5 -mx-3 transition-colors",
        nudge && !checked ? "bg-tungsten/12 ring-1 ring-tungsten/60" : "hover:bg-paper/5",
      )}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cx(
          "mt-px size-[22px] shrink-0 rounded-md flex items-center justify-center transition peer-focus-visible:ring-2 peer-focus-visible:ring-paper/60",
          checked ? "bg-paper text-ink" : "border-[1.5px] border-paper/40",
        )}
      >
        {checked && <CheckIcon size={14} />}
      </span>
      <span className="text-[13px] leading-[1.45] text-smoke text-pretty">
        I&apos;m 18 or older and agree to the Mixstro{" "}
        <Link href="/terms" className="text-paper underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" className="text-paper underline underline-offset-2">Privacy Policy</Link>.
      </span>
    </label>
  );
}
