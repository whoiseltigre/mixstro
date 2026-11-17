import { HIGHLIGHT_SELECT, SAMPLE_HIGHLIGHTS, SAMPLE_OPEN_TO, fromHighlightRow, sortHighlights, type Highlight, type HighlightRow } from "./highlights";
import type { Musician } from "./mock";
import { createClient } from "./supabase/server";

export type ProfileExtras = { openTo: string[]; highlights: Highlight[] };

/**
 * "Open to" and highlights for a profile page. Read separately from the main profile
 * query, so a hiccup here never breaks the rest of the page.
 */
export async function getProfileExtras(person: Musician): Promise<ProfileExtras> {
  if (person.sample) return { openTo: SAMPLE_OPEN_TO[person.username] ?? [], highlights: SAMPLE_HIGHLIGHTS[person.username] ?? [] };
  const supabase = await createClient();
  if (!supabase) return { openTo: SAMPLE_OPEN_TO[person.username] ?? [], highlights: SAMPLE_HIGHLIGHTS[person.username] ?? [] };
  const [{ data: p }, { data: h }] = await Promise.all([
    supabase.from("profiles").select("open_to").eq("id", person.id).maybeSingle<{ open_to: string[] }>(),
    supabase.from("highlights").select(HIGHLIGHT_SELECT).eq("profile_id", person.id).order("rank"),
  ]);
  return { openTo: p?.open_to ?? [], highlights: sortHighlights(((h ?? []) as HighlightRow[]).map(fromHighlightRow)) };
}
