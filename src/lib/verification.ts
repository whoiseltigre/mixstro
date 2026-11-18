"use client";

import { useEffect, useState } from "react";
import { NATIVE_AUTH_CALLBACK, isNativeApp, openInSafari } from "@/lib/native";
import { createClient } from "@/lib/supabase/client";

/**
 * Light verification (#10): a profile is verified once it's tied to a Google account
 * (Apple too, once Sign in with Apple is on). The database keeps profiles.verified_at in sync.
 */
export const VERIFYING_PROVIDERS = ["google", "apple"];

export function useVerification() {
  const [state, setState] = useState<{ ready: boolean; verified: boolean; signedIn: boolean }>({ ready: false, verified: false, signedIn: false });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return setState({ ready: true, verified: false, signedIn: false });
    supabase.auth.getUser().then(({ data: { user } }) => {
      const verified = Boolean(user?.identities?.some((i) => VERIFYING_PROVIDERS.includes(i.provider)));
      setState({ ready: true, verified, signedIn: Boolean(user) });
    });
  }, []);

  async function linkGoogle(): Promise<{ error?: string }> {
    const supabase = createClient();
    if (!supabase) return { error: "Verification needs a real account. It's off in demo mode." };
    if (isNativeApp()) {
      // Google won't sign in inside the app's web view: use a Safari sheet that returns to the app.
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${NATIVE_AUTH_CALLBACK}?next=/settings`, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return { error: error?.message ?? "Couldn't open Google." };
      await openInSafari(data.url);
      return {};
    }
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/settings` },
    });
    return error ? { error: error.message } : {};
  }

  return { ...state, linkGoogle };
}
