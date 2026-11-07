"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Notification settings (#9). Every sender checks `wants(prefs, type, channel)` before sending. */

export { NOTIFICATION_TYPES, wants, type Channel, type NotificationType, type Prefs } from "./notification-types";
import type { Channel, Prefs } from "./notification-types";

const KEY = "mixstro:notification-prefs";

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [ready, setReady] = useState(false);
  const current = useRef<Prefs>({});
  current.current = prefs;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (supabase && user) {
        const { data } = await supabase.from("notification_prefs").select("prefs").eq("profile_id", user.id).maybeSingle();
        setPrefs((data?.prefs as Prefs) ?? {});
      } else {
        try {
          setPrefs(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
        } catch {
          // Private mode: defaults.
        }
      }
      setReady(true);
    })();
  }, []);

  const set = useCallback(async (type: string, channel: Channel, on: boolean) => {
    const next = { ...current.current, [`${type}.${channel}`]: on };
    current.current = next;
    setPrefs(next);
    const supabase = createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (supabase && user) {
      await supabase.from("notification_prefs").upsert({ profile_id: user.id, prefs: next, updated_at: new Date().toISOString() });
    } else {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private mode: keep it in memory.
      }
    }
  }, []);

  return { prefs, set, ready };
}
