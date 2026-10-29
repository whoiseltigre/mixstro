"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Notification settings (#9). Every sender checks `wants(prefs, type, channel)` before sending. */

export type Channel = "push" | "email";
export type NotificationType = { id: string; title: string; sub: string; defaults: Record<Channel, boolean> };

export const NOTIFICATION_TYPES: NotificationType[] = [
  { id: "connect", title: "New Connects", sub: "When someone wants to play with you", defaults: { push: true, email: true } },
  { id: "message", title: "Messages", sub: "New messages and voice notes", defaults: { push: true, email: false } },
  { id: "jam", title: "Jam invites", sub: "Invites, new times, and reminders", defaults: { push: true, email: true } },
  { id: "board", title: "Board replies", sub: "When someone answers your post", defaults: { push: true, email: false } },
  { id: "alerts", title: "Musicians you're looking for", sub: "When the role you need joins nearby", defaults: { push: true, email: false } },
  { id: "digest", title: "Weekly digest", sub: "New people and posts in your area, once a week", defaults: { push: false, email: true } },
];

export type Prefs = Record<string, boolean>; // "<type>.<channel>" → on/off; missing means default

export function wants(prefs: Prefs, type: string, channel: Channel) {
  const key = `${type}.${channel}`;
  if (key in prefs) return prefs[key];
  return NOTIFICATION_TYPES.find((t) => t.id === type)?.defaults[channel] ?? false;
}

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
