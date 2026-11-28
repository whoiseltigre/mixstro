"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdultCheck } from "@/components/adult-check";
import { AppleIcon, Button, ButtonLink, GoogleButton } from "@/components/ui";
import { NATIVE_AUTH_CALLBACK, isNativeApp, nativeAppleSignIn, nativePlatform, openInSafari } from "@/lib/native";
import { adultConfirmed, confirmAdult } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";

// Apple sign-in needs a paid Apple Developer membership; it stays hidden until the provider is set up.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_SIGN_IN === "on";

export function SignInButtons() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [adult, setAdult] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [native, setNative] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    setAdult(adultConfirmed());
    setNative(isNativeApp() ? (nativePlatform() === "android" ? "android" : "ios") : null);
  }, []);

  function tick(on: boolean) {
    setAdult(on);
    confirmAdult(on);
  }

  /** Until the box is ticked the buttons stay tappable but only point at the box. */
  function gate() {
    if (adult) return true;
    setNudge(true);
    return false;
  }

  async function oauth(provider: "apple" | "google") {
    if (!gate()) return;
    const supabase = createClient();
    if (!supabase) {
      router.push("/onboarding/who");
      return;
    }
    if (isNativeApp()) return nativeOauth(provider, supabase);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  /**
   * In the iPhone app: Apple uses the native Face ID sheet. Google won't sign in inside an app's
   * web view, so it opens in a Safari sheet (a Chrome Custom Tab on Android, where Apple goes the
   * same way) and comes back through the app's own link
   * (NATIVE_AUTH_CALLBACK, handled in native-shell.tsx).
   */
  async function nativeOauth(provider: "apple" | "google", supabase: NonNullable<ReturnType<typeof createClient>>) {
    try {
      if (provider === "apple" && nativePlatform() === "ios") {
        const apple = await nativeAppleSignIn();
        if (!apple) return setError("Sign in with Apple isn't available in this version of the app.");
        const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: apple.token, nonce: apple.nonce });
        if (error || !data.user) return setError(error?.message ?? "Apple sign-in didn't finish. Try again.");
        const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", data.user.id).maybeSingle();
        router.replace(profile?.onboarded_at ? "/discover" : "/onboarding/who");
        return;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: NATIVE_AUTH_CALLBACK, skipBrowserRedirect: true },
      });
      if (error || !data.url) return setError(error?.message ?? "Couldn't open sign-in.");
      await openInSafari(data.url);
    } catch (e) {
      // Closing Apple's sheet lands here too; that isn't an error worth showing.
      const msg = (e as Error)?.message ?? "";
      if (!/cancel|1001/i.test(msg)) setError("Sign-in didn't finish. Try again.");
    }
  }

  // App Store rule 4.8: an app that offers Google sign-in must offer Sign in with Apple too, so in
  // the iPhone app Google only shows once Apple is switched on. Android has no such rule.
  const showGoogle = native !== "ios" || APPLE_ENABLED;

  // Full strength always: a faded button reads as broken. Tapping one before the box is ticked points at the box.
  const dim = "";

  return (
    <div className="flex flex-col gap-2.5">
      <AdultCheck checked={adult} onChange={tick} nudge={nudge} />
      {APPLE_ENABLED && (
        <Button onClick={() => oauth("apple")} aria-disabled={!adult} className={dim}>
          <AppleIcon /> Continue with Apple
        </Button>
      )}
      {showGoogle && <GoogleButton onClick={() => oauth("google")} aria-disabled={!adult} className={dim} />}
      <ButtonLink
        variant="glass"
        href="/auth/email"
        aria-disabled={!adult}
        className={dim}
        onClick={(e) => {
          if (!gate()) e.preventDefault();
        }}
      >
        Continue with email
      </ButtonLink>
      {error && (
        <p role="alert" className="text-center text-footnote text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
