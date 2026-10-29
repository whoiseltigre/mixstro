"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppleIcon, Button, ButtonLink, GoogleIcon } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

// Apple sign-in needs a paid Apple Developer membership; it stays hidden until the provider is set up.
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_SIGN_IN === "on";

export function SignInButtons() {
  const router = useRouter();
  const [error, setError] = useState<string>();

  async function oauth(provider: "apple" | "google") {
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

  return (
    <div className="flex flex-col gap-2.5">
      {APPLE_ENABLED && (
        <Button onClick={() => oauth("apple")}>
          <AppleIcon /> Continue with Apple
        </Button>
      )}
      <Button variant={APPLE_ENABLED ? "glass" : "primary"} onClick={() => oauth("google")}>
        <GoogleIcon /> Continue with Google
      </Button>
      <ButtonLink variant="glass" href="/auth/email">
        Continue with email
      </ButtonLink>
      {error && (
        <p role="alert" className="text-center text-[13px] text-[#FF453A]">
          {error}
        </p>
      )}
      <p className="mt-1.5 text-center text-[12px] leading-[1.4] text-smoke">
        By continuing you agree to the Mixstro{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </div>
  );
}
