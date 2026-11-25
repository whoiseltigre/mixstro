import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

let admin: SupabaseClient | null | undefined;

/** The server's own database client (service role). Never sent to the browser. Null when the key isn't set. */
export function adminClient() {
  if (admin !== undefined) return admin;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin = key && SUPABASE_URL ? createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return admin;
}
