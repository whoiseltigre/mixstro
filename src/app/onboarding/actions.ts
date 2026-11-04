"use server";

import { ensureLocation, type Point } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";

/** Stores your rough point after onboarding saves your neighborhood. Never fails the save. */
export async function saveMyLocation(neighborhood: string, point?: Point) {
  try {
    const supabase = await createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const valid = point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
    await ensureLocation(supabase, user.id, neighborhood, valid ? point : undefined);
  } catch {
    // Distances fill in later from the neighborhood name.
  }
}
