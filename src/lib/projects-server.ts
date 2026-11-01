import type { Musician } from "./mock";
import { PROJECT_SELECT, SAMPLE_PROJECTS, fromRow, sortProjects, type Project, type ProjectRow } from "./projects";
import { createClient } from "./supabase/server";

/** Someone's projects for their profile page. Sample musicians use the canned ones. */
export async function getProjects(person: Musician): Promise<Project[]> {
  if (person.sample) return SAMPLE_PROJECTS[person.username] ?? [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("projects").select(PROJECT_SELECT).eq("profile_id", person.id);
  return sortProjects(((data ?? []) as ProjectRow[]).map(fromRow));
}
