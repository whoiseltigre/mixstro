"use client";

import { useCallback, useEffect, useState } from "react";
import { HIGHLIGHTS_MAX, HIGHLIGHT_SELECT, fromHighlightRow, sortHighlights, type Highlight, type HighlightRow } from "./highlights";
import { createClient, sessionUser } from "./supabase/client";

/**
 * Your own "Open to" and highlights: Supabase when signed in, the browser in demo mode.
 * Each change saves straight away.
 */

const KEY = "mixstro:extras";

type Local = { openTo: string[]; highlights: Highlight[] };

function readLocal(): Local {
  try {
    return { openTo: [], highlights: [], ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { openTo: [], highlights: [] };
  }
}

function writeLocal(v: Local) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Private mode: keep going in memory.
  }
}

export type HighlightInput = Omit<Highlight, "id">;

export function useMyExtras() {
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const supabase = createClient();
      const user = supabase ? await sessionUser(supabase) : null;
      if (!supabase || !user) {
        const l = readLocal();
        if (live) {
          setOpenTo(l.openTo);
          setHighlights(l.highlights);
        }
      } else {
        const [{ data: p }, { data: h }] = await Promise.all([
          supabase.from("profiles").select("open_to").eq("id", user.id).maybeSingle<{ open_to: string[] }>(),
          supabase.from("highlights").select(HIGHLIGHT_SELECT).eq("profile_id", user.id).order("rank"),
        ]);
        if (live) {
          setUserId(user.id);
          setOpenTo(p?.open_to ?? []);
          setHighlights(sortHighlights(((h ?? []) as HighlightRow[]).map(fromHighlightRow)));
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const toggleOpenTo = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      const next = openTo.includes(id) ? openTo.filter((x) => x !== id) : [...openTo, id];
      setOpenTo(next);
      const supabase = createClient();
      if (!supabase || !userId) {
        writeLocal({ ...readLocal(), openTo: next });
        return {};
      }
      const { error } = await supabase.from("profiles").update({ open_to: next }).eq("id", userId);
      if (error) {
        setOpenTo(openTo);
        return { error: "That didn't save. Try again." };
      }
      return {};
    },
    [openTo, userId],
  );

  const saveHighlight = useCallback(
    async (input: HighlightInput, id?: string): Promise<{ error?: string }> => {
      const title = input.title.trim();
      if (!title) return { error: "Give it a title." };
      const url = input.url?.trim() || undefined;
      if (url && !/^https:\/\/\S+\.\S+/.test(url)) return { error: "Links need to start with https://" };
      if (!id && highlights.length >= HIGHLIGHTS_MAX) return { error: `You can add up to ${HIGHLIGHTS_MAX} highlights.` };
      const clean: HighlightInput = { kind: input.kind, title, detail: input.detail?.trim() || undefined, year: input.year || undefined, url };
      const supabase = createClient();
      if (!supabase || !userId) {
        const item = { ...clean, id: id ?? crypto.randomUUID() };
        const next = sortHighlights(id ? highlights.map((h) => (h.id === id ? item : h)) : [...highlights, item]);
        setHighlights(next);
        writeLocal({ ...readLocal(), highlights: next });
        return {};
      }
      const fields = { kind: clean.kind, title: clean.title, detail: clean.detail ?? null, year: clean.year ?? null, url: clean.url ?? null };
      const { data, error } = id
        ? await supabase.from("highlights").update(fields).eq("id", Number(id)).select(HIGHLIGHT_SELECT).single<HighlightRow>()
        : await supabase.from("highlights").insert({ ...fields, profile_id: userId }).select(HIGHLIGHT_SELECT).single<HighlightRow>();
      if (error || !data) return { error: error?.message ?? "Couldn't save that. Try again." };
      const item = fromHighlightRow(data);
      setHighlights((list) => sortHighlights(id ? list.map((h) => (h.id === id ? item : h)) : [...list, item]));
      return {};
    },
    [highlights, userId],
  );

  const removeHighlight = useCallback(
    async (id: string) => {
      setHighlights((list) => list.filter((h) => h.id !== id));
      const supabase = createClient();
      if (!supabase || !userId) {
        const local = readLocal();
        return writeLocal({ ...local, highlights: local.highlights.filter((h) => h.id !== id) });
      }
      await supabase.from("highlights").delete().eq("id", Number(id));
    },
    [userId],
  );

  return { ready, openTo, highlights, toggleOpenTo, saveHighlight, removeHighlight };
}
