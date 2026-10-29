import type { Musician } from "./mock";
import { JOURNEY_COLUMNS, SAMPLE_JOURNEYS, fromRow, type JourneyEntry, type JourneyRow } from "./journey";
import { createClient } from "./supabase/server";

/** Someone's journey for their profile page. Sample musicians use the canned ones. */
export async function getJourney(person: Musician): Promise<JourneyEntry[]> {
  if (person.sample) return SAMPLE_JOURNEYS[person.username] ?? [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("journey_entries")
    .select(JOURNEY_COLUMNS)
    .eq("profile_id", person.id)
    .order("year", { ascending: false })
    .order("created_at");
  return ((data ?? []) as JourneyRow[]).map(fromRow);
}
