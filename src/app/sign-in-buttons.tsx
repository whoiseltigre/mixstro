"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdultCheck } from "@/components/adult-check";
import { AppleIcon, Button, ButtonLink, GoogleButton, cx } from "@/components/ui";
import { adultConfirmed, confirmAdult } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";

// Apple sign-in needs a paid Apple Developer membership; it stays hidden until the provider is set up.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_SIGN_IN === "on";

export function SignInButtons() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [adult, setAdult] = useState(false);
  const [nudge, setNudge] = useState(false);

  useEffect(() => setAdult(adultConfirmed()), []);

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
      router.push("/onboarding/basics");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  const dim = cx("transition-opacity", !adult && "opacity-50");

  return (
    <div className="flex flex-col gap-2.5">
      <AdultCheck checked={adult} onChange={tick} nudge={nudge} />
      {APPLE_ENABLED && (
        <Button onClick={() => oauth("apple")} aria-disabled={!adult} className={dim}>
          <AppleIcon /> Continue with Apple
        </Button>
      )}
      <GoogleButton onClick={() => oauth("google")} aria-disabled={!adult} className={dim} />
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
        <p role="alert" className="text-center text-[13px] text-[#FF453A]">
          {error}
        </p>
      )}
    </div>
  );
}
