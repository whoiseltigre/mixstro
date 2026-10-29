"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { activityLabel } from "@/lib/presence";
import { cx } from "./ui";

const KEY = "mixstro:last-touch";
const HOUR = 60 * 60 * 1000;

/** Marks the signed-in person active when they open the app. At most once an hour per device. */
export function ActivityPing() {
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const last = Number(localStorage.getItem(KEY) ?? 0);
      if (Date.now() - last < HOUR) return;
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // Private mode: the server-side hourly guard still applies.
    }
    supabase.rpc("touch_last_active").then(() => {});
  }, []);
  return null;
}

/** Green dot plus "Active today" / "Active this week". Renders nothing for anyone quieter. */
export function ActivityBadge({ lastActiveAt, className }: { lastActiveAt: string | Date; className?: string }) {
  const label = activityLabel(lastActiveAt);
  if (!label) return null;
  return (
    <span className={cx("inline-flex items-center gap-1.5", className)}>
      <span className="size-2 rounded-full bg-[#30D158]" aria-hidden="true" />
      {label}
    </span>
  );
}
