"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "@/components/toast";
import { decideClaim, resolveRemoval } from "./claim-actions";

export type ClaimQueueData = {
  claims: {
    id: number;
    band_id: number;
    band: string;
    state: "unclaimed" | "claimed";
    instagram_url: string | null;
    website_url: string | null;
    seat: string | null;
    role: string | null;
    code: string;
    proof_url: string | null;
    created_at: string;
    username: string;
    first_name: string;
  }[];
  removals: { id: number; band_id: number | null; band: string; contact: string | null; reason: string | null; created_at: string }[];
  unclaimed: number;
  claimed_from_pilot: number;
};

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const chip = "press h-9 px-3.5 rounded-full text-footnote font-semibold disabled:opacity-40";

/**
 * Claim pilot on Pulse: claims to check (open the proof link, look for the code, approve) and
 * requests to take a page down (do those within a day).
 */
export function ClaimQueue({ q }: { q: ClaimQueueData }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const act = (key: string, run: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const r = await run();
      if (r.error) {
        toast(r.error);
        return;
      }
      setDone((d) => new Set(d).add(key));
      toast(ok);
    });
  const claims = q.claims.filter((c) => !done.has(`c${c.id}`));
  const removals = q.removals.filter((r) => !done.has(`r${r.id}`));

  return (
    <section aria-labelledby="claims" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="claims" className="text-body-lg font-semibold">Band claims</h2>
        <p className="text-footnote text-smoke">
          {q.unclaimed} unclaimed pilot {q.unclaimed === 1 ? "page" : "pages"} · {q.claimed_from_pilot} claimed so far. Open the link, check the code is on the band&apos;s official account, then approve.
        </p>
      </div>
      {claims.length === 0 && removals.length === 0 && <p className="text-callout text-smoke">Nothing waiting.</p>}
      <ul className="flex flex-col gap-2.5">
        {claims.map((c) => (
          <li key={c.id} className="p-4 rounded-card bg-stage border border-paper/8 flex flex-col gap-2">
            <span className="text-callout">
              <Link href={`/@${c.username}`} className="font-semibold underline underline-offset-2">{c.first_name}</Link> claims{" "}
              {c.seat ? (
                <>
                  <b>{c.seat}</b>
                  {c.role ? ` (${c.role})` : ""} in{" "}
                </>
              ) : null}
              <Link href={`/b/${c.band_id}`} className="font-semibold underline underline-offset-2">{c.band}</Link>
              <span className="text-smoke"> · {when(c.created_at)}</span>
            </span>
            <span className="text-footnote text-smoke flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Code <span className="font-mono text-tungsten">{c.code}</span>
              </span>
              {c.proof_url ? (
                <a href={c.proof_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-paper">Their proof link</a>
              ) : (
                <span>No proof link yet</span>
              )}
              {c.instagram_url && <a href={c.instagram_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Band Instagram</a>}
              {c.website_url && <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Band website</a>}
            </span>
            <span className="flex gap-2 pt-1">
              <button type="button" disabled={pending || !c.proof_url} className={`${chip} bg-paper text-ink`} onClick={() => act(`c${c.id}`, () => decideClaim(String(c.id), true), `${c.first_name} is in ${c.band}`)}>
                Approve
              </button>
              <button type="button" disabled={pending} className={`${chip} border border-paper/20`} onClick={() => act(`c${c.id}`, () => decideClaim(String(c.id), false), "Rejected")}>
                Reject
              </button>
            </span>
          </li>
        ))}
        {removals.map((r) => (
          <li key={`r${r.id}`} className="p-4 rounded-card bg-stage border border-danger/40 flex flex-col gap-2">
            <span className="text-callout">
              Take down <b>{r.band}</b>?<span className="text-smoke"> · asked {when(r.created_at)}</span>
            </span>
            {(r.contact || r.reason) && <span className="text-footnote text-smoke whitespace-pre-line">{[r.contact, r.reason].filter(Boolean).join("\n")}</span>}
            <span className="flex gap-2 pt-1">
              <button type="button" disabled={pending} className={`${chip} bg-danger text-paper`} onClick={() => act(`r${r.id}`, () => resolveRemoval(String(r.id), true), `${r.band} removed`)}>
                Remove page
              </button>
              <button type="button" disabled={pending} className={`${chip} border border-paper/20`} onClick={() => act(`r${r.id}`, () => resolveRemoval(String(r.id), false), "Dismissed")}>
                Dismiss
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
