"use client";

import { useCallback, useEffect, useState } from "react";
import { parseClip } from "./clips";
import { PROJECT_SELECT, fromRow, sortProjects, type Project, type ProjectRow, type Track } from "./projects";
import { createClient } from "./supabase/client";

const KEY = "mixstro:projects";

export type ProjectInput = Omit<Project, "id" | "artwork">;

function readLocal(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocal(projects: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(projects));
  } catch {
    // Private mode: keep going in memory.
  }
}

const clean = (s?: string) => s?.trim() || null;

/** Your own projects: from Supabase when signed in, otherwise kept in the browser (demo mode). */
export function useMyProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const supabase = createClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (!supabase || !user) {
        if (live) setProjects(sortProjects(readLocal()));
      } else {
        const { data } = await supabase.from("projects").select(PROJECT_SELECT).eq("profile_id", user.id);
        if (live) {
          setUserId(user.id);
          setProjects(sortProjects(((data ?? []) as ProjectRow[]).map(fromRow)));
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const save = useCallback(
    async (input: ProjectInput, id?: string): Promise<{ error?: string }> => {
      if (!input.name.trim()) return { error: "Give the project a name." };
      if (input.endYear !== undefined && input.endYear < input.startYear) return { error: "The end year can't be before the start year." };
      const tracks = input.tracks.filter((t) => t.url && parseClip(t.url));
      const supabase = createClient();

      if (!supabase || !userId) {
        const project: Project = { ...input, id: id ?? crypto.randomUUID(), name: input.name.trim(), role: clean(input.role) ?? undefined, tracks };
        const next = sortProjects(id ? projects.map((p) => (p.id === id ? project : p)) : [...projects, project]);
        setProjects(next);
        writeLocal(next);
        return {};
      }

      const fields = { name: input.name.trim(), role: clean(input.role), start_year: input.startYear, end_year: input.endYear ?? null };
      const { data: row, error } = id
        ? await supabase.from("projects").update(fields).eq("id", Number(id)).select("id").single<{ id: number }>()
        : await supabase.from("projects").insert({ ...fields, profile_id: userId }).select("id").single<{ id: number }>();
      if (error || !row) return { error: error?.message ?? "Couldn't save that. Try again." };

      // Tracks are few, so replace them wholesale rather than diffing.
      await supabase.from("project_tracks").delete().eq("project_id", row.id);
      if (tracks.length) {
        const { error: trackErr } = await supabase.from("project_tracks").insert(
          tracks.map((t: Track, rank) => ({
            project_id: row.id,
            profile_id: userId,
            provider: t.provider,
            url: t.url,
            title: clean(t.title),
            thumb_url: clean(t.thumb),
            rank,
          })),
        );
        if (trackErr) return { error: trackErr.message };
      }
      const { data } = await supabase.from("projects").select(PROJECT_SELECT).eq("id", row.id).single<ProjectRow>();
      if (data) {
        const saved = fromRow(data);
        setProjects((prev) => sortProjects(id ? prev.map((p) => (p.id === id ? saved : p)) : [...prev, saved]));
      }
      return {};
    },
    [projects, userId],
  );

  const remove = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      const supabase = createClient();
      if (supabase && userId) {
        const { error } = await supabase.from("projects").delete().eq("id", Number(id));
        if (error) return { error: error.message };
      }
      const next = projects.filter((p) => p.id !== id);
      setProjects(next);
      if (!userId) writeLocal(next);
      return {};
    },
    [projects, userId],
  );

  return { projects, ready, save, remove };
}
