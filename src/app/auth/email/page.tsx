"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function EmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    }
    router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <form onSubmit={submit} className="min-h-dvh flex flex-col">
      <StepHeader back="/" />
      <StepTitle title="What's your email?" sub="We'll send a 6-digit code. No password to remember." />
      <div className="px-5 pt-8">
        <Field
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p role="alert" className="mt-3 text-[13px] text-[#FF453A]">{error}</p>}
      </div>
      <StepFooter>
        <Button type="submit" disabled={!valid || busy}>
          {busy ? "Sending…" : "Send code"}
        </Button>
      </StepFooter>
    </form>
  );
}
