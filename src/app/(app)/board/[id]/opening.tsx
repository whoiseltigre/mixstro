"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PersonPhoto } from "@/components/person-photo";
import { nounFor } from "@/lib/instruments";
import { statusLine } from "@/lib/opening-reasons";
import type { CandidateView, Opening } from "@/lib/openings";
import { alertMeFor, renewOpening, setOpeningStatus } from "../actions";

/** Your opening's status with Pause / Filled / Renew, and who nearby fits, with reasons. */
export function OpeningPanel({ postId, opening, candidates }: { postId: number; opening: Opening; candidates?: CandidateView }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [alerted, setAlerted] = useState(false);
  const who = nounFor(opening.neededRole);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      setError(r.error);
    });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-callout font-semibold">{statusLine(opening.status, opening.expiresAt)}</span>
        <div className="flex gap-2">
          {opening.status === "open" && (
            <button type="button" disabled={pending} onClick={() => run(() => setOpeningStatus(postId, "paused"))} className="h-9 px-3.5 rounded-full border border-paper/20 text-footnote hover:bg-paper/10 transition">
              Pause
            </button>
          )}
          {opening.status === "paused" && (
            <button type="button" disabled={pending} onClick={() => run(() => setOpeningStatus(postId, "open"))} className="h-9 px-3.5 rounded-full border border-paper/20 text-footnote hover:bg-paper/10 transition">
              Reopen
            </button>
          )}
          {(opening.status === "expired" || (opening.status === "open" && opening.expiresAt && new Date(opening.expiresAt).getTime() - Date.now() < 4 * 86_400_000)) && (
            <button type="button" disabled={pending} onClick={() => run(() => renewOpening(postId))} className="h-9 px-3.5 rounded-full border border-paper/20 text-footnote hover:bg-paper/10 transition">
              Renew 2 weeks
            </button>
          )}
          {opening.status !== "filled" && (
            <button type="button" disabled={pending} onClick={() => run(() => setOpeningStatus(postId, "filled"))} className="h-9 px-3.5 rounded-full bg-paper text-ink text-footnote font-semibold">
              Filled
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-footnote text-danger-soft">{error}</p>}

      {opening.status === "open" && candidates && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-title4 font-semibold tracking-[-0.01em]">{who[0].toUpperCase() + who.slice(1)}s near you</h2>
          {candidates.state === "no_location" && (
            <p className="rounded-card bg-stage p-4 text-subhead text-smoke">
              We don&rsquo;t know where you are yet, so we can&rsquo;t look nearby. <Link href="/settings" className="text-paper underline underline-offset-2">Add your neighborhood</Link>.
            </p>
          )}
          {candidates.state === "unavailable" && <p className="rounded-card bg-stage p-4 text-subhead text-smoke">Suggestions aren&rsquo;t available right now.</p>}
          {candidates.state === "ok" && candidates.people.length === 0 && (
            <div className="rounded-card bg-stage p-4 flex flex-col gap-3">
              <p className="text-subhead text-smoke">
                No {who}s within {opening.radiusMi ?? 25} mi have joined yet. Your opening is up, and we&rsquo;ll alert {who}s nearby as they join.
              </p>
              <button
                type="button"
                disabled={alerted || pending}
                onClick={() => run(async () => { const r = await alertMeFor(opening.neededRole); if (!r.error) setAlerted(true); return r; })}
                className="self-start h-9 px-3.5 rounded-full border border-paper/20 text-footnote hover:bg-paper/10 transition disabled:opacity-60"
              >
                {alerted ? `We'll tell you when a ${who} joins` : `Tell me when a ${who} joins`}
              </button>
            </div>
          )}
          <ul className="flex flex-col gap-2.5">
            {candidates.people.map(({ person: m, reasons }) => (
              <li key={m.id}>
                <Link href={`/m/${m.username}`} className="flex gap-3.5 p-3.5 rounded-card bg-stage hover:bg-riser transition">
                  <span className="relative size-14 rounded-full overflow-hidden shrink-0">
                    <PersonPhoto person={m} sizes="56px" initialsSize={20} />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-body font-semibold">{m.name}</span>
                    <span className="text-footnote text-smoke truncate">{[m.instrument, m.genres, m.neighborhood].join(" · ")}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {reasons.map((r) => (
                        <span key={r} className="h-6 px-2.5 rounded-full bg-riser text-caption flex items-center">
                          {r}
                        </span>
                      ))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
