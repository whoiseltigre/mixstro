import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./supabase/config";
import type { OpeningStatus } from "./opening-reasons";

/** What a shared opening link shows (public_opening): no coordinates, contact details or private media. */
export type PublicOpening = {
  id: number;
  title: string;
  details: string | null;
  kind: string;
  needed_role: string;
  offered_role: string | null;
  rehearsal_days: string[];
  event_date: string | null;
  area: string;
  status: OpeningStatus;
  expires_at: string | null;
  author: { id: string; first_name: string; username: string; avatar_url: string | null; instrument: string | null };
  band: string | null;
  clip: { id: number; provider: string | null; url: string } | null;
};


export const getPublicOpening = cache(async (id: string): Promise<PublicOpening | null> => {
  if (!isSupabaseConfigured || !/^\d{1,18}$/.test(id)) return null;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await db.rpc("public_opening", { p_id: Number(id) });
  return (data as PublicOpening | null) ?? null;
});
