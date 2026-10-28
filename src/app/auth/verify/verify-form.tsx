"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const LENGTH = 6;

export function VerifyForm() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [wait, setWait] = useState(30);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(token: string) {
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    if (!supabase) {
      router.push("/onboarding/basics");
      return;
    }
    const { data: auth, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error || !auth.user) {
      setError("That code didn't work. Check it and try again.");
      setBusy(false);
      return;
    }
    const { data } = await supabase.from("profiles").select("onboarded_at").eq("id", auth.user.id).maybeSingle();
    router.replace(data?.onboarded_at ? "/discover" : "/onboarding/basics");
  }

  async function resend() {
    setWait(30);
    await createClient()?.auth.signInWithOtp({ email });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === LENGTH) verify(code);
      }}
      className="min-h-dvh flex flex-col"
    >
      <StepHeader back="/auth/email" />
      <StepTitle title="Enter the code" sub={`Sent to ${email || "your email"}. Enter the code, or just tap the link in the email.`} />
      <div className="px-5 pt-8 flex flex-col gap-5">
        <label className="relative block">
          <span className="sr-only">6-digit code</span>
          <input
            value={code}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, LENGTH);
              setCode(next);
              if (next.length === LENGTH) verify(next);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="absolute inset-0 opacity-0"
          />
          <div aria-hidden="true" className="flex gap-2">
            {Array.from({ length: LENGTH }, (_, i) => (
              <span
                key={i}
                className={`flex-1 h-[60px] rounded-2xl bg-stage border flex items-center justify-center headline text-[26px] ${
                  i === code.length ? "border-paper/60" : "border-paper/12"
                }`}
              >
                {code[i] ?? ""}
              </span>
            ))}
          </div>
        </label>
        {error && <p role="alert" className="text-[13px] text-[#FF453A]">{error}</p>}
        <p className="text-[14px] text-smoke">
          Didn&apos;t get it?{" "}
          {wait > 0 ? (
            <span className="tabular-nums">Resend in 0:{String(wait).padStart(2, "0")}</span>
          ) : (
            <button type="button" onClick={resend} className="font-semibold text-paper underline">
              Resend code
            </button>
          )}
        </p>
      </div>
      <StepFooter>
        <Button type="submit" disabled={code.length < LENGTH || busy}>
          {busy ? "Checking…" : "Verify"}
        </Button>
      </StepFooter>
    </form>
  );
}
