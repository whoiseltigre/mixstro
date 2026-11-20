"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BackButton, Button, ChevronRight, GoogleIcon, VerifiedMark } from "@/components/ui";
import { deleteAccount, signOut } from "@/lib/safety";
import { createClient } from "@/lib/supabase/client";
import { useVerification } from "@/lib/verification";
import { PublicPageToggle } from "./public-page";

export default function Settings() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const verification = useVerification();
  const [linkError, setLinkError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);

  async function leave() {
    setSigningOut(true);
    const { error } = await signOut();
    if (error) {
      setSigningOut(false);
      return setError(error);
    }
    // A full load, so nothing from this account stays in memory.
    window.location.replace("/");
  }
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    createClient()?.rpc("can_view_pulse").then(({ data }) => setPulse(data === true), () => {});
  }, []);

  async function remove() {
    setBusy(true);
    const { error } = await deleteAccount();
    setBusy(false);
    if (error) return setError(error);
    router.replace("/");
  }

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:max-w-[680px] md:mx-auto">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/me" />
        <h1 className="headline text-title-lg">Settings</h1>
      </header>

      <section className="flex flex-col gap-3 p-4 rounded-card bg-stage">
        <div className="flex items-center gap-3">
          <VerifiedMark size={28} className={verification.verified ? "text-paper" : "text-paper/25"} />
          <span className="flex-1 flex flex-col gap-0.5">
            <span className="text-callout font-semibold">{verification.verified ? "You're verified" : "Get verified"}</span>
            <span className="text-footnote text-smoke text-pretty">
              {verification.verified
                ? "Your profile shows a check, so people know you're real."
                : "Link your Google account and your profile gets a check. It's free, and we never post anything."}
            </span>
          </span>
        </div>
        {verification.ready && !verification.verified && (
          <Button
            variant="glass"
            className="h-12 text-body"
            onClick={async () => setLinkError((await verification.linkGoogle()).error)}
          >
            <GoogleIcon /> Link Google
          </Button>
        )}
        {linkError && <p role="alert" className="text-footnote text-danger">{linkError}</p>}
      </section>

      <PublicPageToggle />

      <ul className="flex flex-col rounded-card bg-stage divide-y divide-paper/8">
        <Row href="/settings/notifications" title="Notifications" sub="Push and email, per type" />
        <Row href="/settings/feedback" title="Send feedback" sub="Tell us what's broken, missing or great" />
        {pulse && <Row href="/pulse" title="Pulse" sub="How Mixstro is doing (only you see this)" />}
        <Row href="/privacy" title="Privacy Policy" />
        <Row href="/terms" title="Terms" />
      </ul>

      <section className="flex flex-col gap-3 pt-2">
        <h2 className="text-footnote font-semibold text-smoke">Account</h2>
        <button type="button" onClick={leave} disabled={signingOut} className="h-14 rounded-card bg-stage text-body font-semibold disabled:opacity-60">
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {error && !confirming && <p role="alert" className="text-footnote text-danger">{error}</p>}
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="h-14 rounded-card bg-stage text-body font-semibold text-danger">
            Delete my account
          </button>
        ) : (
          <div className="flex flex-col gap-3 p-4 rounded-card bg-stage border border-danger/40">
            <p className="text-callout text-pretty">
              This deletes your profile, clips, connections and messages for good. Type <strong>delete</strong> to confirm.
            </p>
            <label htmlFor="confirm-delete" className="sr-only">Type delete to confirm</label>
            <input
              id="confirm-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className="h-12 rounded-2xl bg-ink border border-paper/12 px-4 text-body outline-none focus:border-paper/50"
            />
            <Button onClick={remove} disabled={typed.trim().toLowerCase() !== "delete" || busy} variant="danger" className="h-12 text-body">
              {busy ? "Deleting…" : "Delete forever"}
            </Button>
            <Button variant="glass" onClick={() => setConfirming(false)} className="h-12 text-body">Keep my account</Button>
            {error && <p role="alert" className="text-footnote text-danger">{error}</p>}
          </div>
        )}
      </section>
    </main>
  );
}

function Row({ href, title, sub }: { href: string; title: string; sub?: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex-1 flex flex-col gap-0.5">
          <span className="text-callout font-semibold">{title}</span>
          {sub && <span className="text-footnote text-smoke">{sub}</span>}
        </span>
        <ChevronRight />
      </Link>
    </li>
  );
}
