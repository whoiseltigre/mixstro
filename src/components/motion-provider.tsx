"use client";

import { useEffect } from "react";
import { haptic, type Haptic } from "@/lib/haptics";

/**
 * App-wide touch feel, mounted once in the root layout.
 *
 * - Haptics by markup: anything with data-haptic="tap|select|success|warning|heavy" plays
 *   that haptic when tapped, so server-rendered buttons get them without client code.
 * - iPhone Safari only shows :active (the press dip) when a touch listener exists; this is it.
 */
export function MotionProvider() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-haptic]");
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      haptic((el.getAttribute("data-haptic") || "tap") as Haptic);
    };
    const noop = () => {};
    document.addEventListener("click", onClick, true);
    document.addEventListener("touchstart", noop, { passive: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("touchstart", noop);
    };
  }, []);
  return null;
}
