import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

export function createClient() {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * The signed-in user from the session already stored in this browser: no network round trip,
 * unlike auth.getUser(). Fine for reads, because the database still checks the token (RLS).
 */
export async function sessionUser(supabase: NonNullable<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
