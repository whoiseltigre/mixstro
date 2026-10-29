"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackButton, Button, ChevronRight } from "@/components/ui";
import { deleteAccount } from "@/lib/safety";

export default function Settings() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function remove() {
    setBusy(true);
    const { error } = await deleteAccount();
    setBusy(false);
    if (error) return setError(error);
    router.replace("/");
  }

  return (
    <main className="pt-safe px-5 pb-32 flex flex-col gap-6">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/me" />
        <h1 className="headline text-[28px]">Settings</h1>
      </header>

      <ul className="flex flex-col rounded-[20px] bg-stage divide-y divide-paper/8">
        <Row href="/settings/notifications" title="Notifications" sub="Push and email, per type" />
        <Row href="/privacy" title="Privacy Policy" />
        <Row href="/terms" title="Terms" />
      </ul>

      <section className="flex flex-col gap-3 pt-2">
        <h2 className="text-[13px] font-semibold text-smoke">Account</h2>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="h-14 rounded-[20px] bg-stage text-[16px] font-semibold text-[#FF453A]">
            Delete my account
          </button>
        ) : (
          <div className="flex flex-col gap-3 p-4 rounded-[20px] bg-stage border border-[#FF453A]/40">
            <p className="text-[15px] text-pretty">
              This deletes your profile, clips, connections and messages for good. Type <strong>delete</strong> to confirm.
            </p>
            <label htmlFor="confirm-delete" className="sr-only">Type delete to confirm</label>
            <input
              id="confirm-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              className="h-12 rounded-2xl bg-ink border border-paper/12 px-4 text-[16px] outline-none focus:border-paper/50"
            />
            <Button onClick={remove} disabled={typed.trim().toLowerCase() !== "delete" || busy} variant="danger" className="h-12 text-[16px]">
              {busy ? "Deleting…" : "Delete forever"}
            </Button>
            <Button variant="glass" onClick={() => setConfirming(false)} className="h-12 text-[16px]">Keep my account</Button>
            {error && <p role="alert" className="text-[13px] text-[#FF453A]">{error}</p>}
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
          <span className="text-[15px] font-semibold">{title}</span>
          {sub && <span className="text-[13px] text-smoke">{sub}</span>}
        </span>
        <ChevronRight />
      </Link>
    </li>
  );
}
