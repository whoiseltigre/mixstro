"use client";

import { useCallback, useEffect, useState } from "react";
import { parseClip } from "./clips";
import { JOURNEY_COLUMNS, fromRow, type JourneyEntry, type JourneyRow } from "./journey";
import { createClient } from "./supabase/client";

const KEY = "mixstro:journey";

export type JourneyInput = { url: string; year: number; title?: string; thumb?: string; note?: string };

function readLocal(): JourneyEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(entries: JourneyEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Private mode: keep going in memory.
  }
}

const clean = (s?: string) => s?.trim() || null;

/** Your own journey: from Supabase when signed in, otherwise kept in the browser (demo mode). */
export function useMyJourney() {
  const [entries, setEntries] = useState<JourneyEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const supabase = createClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (!supabase || !user) {
        if (live) setEntries(readLocal());
      } else {
        const { data } = await supabase
          .from("journey_entries")
          .select(JOURNEY_COLUMNS)
          .eq("profile_id", user.id)
          .order("year", { ascending: false })
          .order("created_at");
        if (live) {
          setUserId(user.id);
          setEntries(((data ?? []) as JourneyRow[]).map(fromRow));
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const save = useCallback(
    async (input: JourneyInput, id?: string): Promise<{ error?: string }> => {
      const clip = parseClip(input.url);
      if (!clip) return { error: "That link isn't one we can play yet. Try YouTube, SoundCloud, Spotify or Apple Music." };
      const fields = { year: input.year, provider: clip.provider, url: clip.url, title: clean(input.title), thumb_url: clean(input.thumb), note: clean(input.note) };
      const supabase = createClient();

      if (!supabase || !userId) {
        const entry: JourneyEntry = fromRow({ ...fields, id: 0, created_at: "" });
        const next = id
          ? entries.map((e) => (e.id === id ? { ...entry, id } : e))
          : [...entries, { ...entry, id: crypto.randomUUID() }];
        setEntries(next);
        writeLocal(next);
        return {};
      }

      const query = id
        ? supabase.from("journey_entries").update(fields).eq("id", Number(id))
        : supabase.from("journey_entries").insert({ ...fields, profile_id: userId });
      const { data, error } = await query.select(JOURNEY_COLUMNS).single<JourneyRow>();
      if (error || !data) return { error: error?.message ?? "Couldn't save that. Try again." };
      const saved = fromRow(data);
      setEntries((prev) => (id ? prev.map((e) => (e.id === id ? saved : e)) : [...prev, saved]));
      return {};
    },
    [entries, userId],
  );

  const remove = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (supabase && userId) {
        const { error } = await supabase.from("journey_entries").delete().eq("id", Number(id));
        if (error) return { error: error.message };
      }
      const next = entries.filter((e) => e.id !== id);
      setEntries(next);
      if (!userId) writeLocal(next);
      return {};
    },
    [entries, userId],
  );

  return { entries, ready, save, remove };
}
