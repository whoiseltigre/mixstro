"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PersonPhoto } from "@/components/person-photo";
import { nounFor } from "@/lib/instruments";
import { statusLine } from "@/lib/opening-reasons";
import { PROVIDER_LABEL, parseClip } from "@/lib/clips";
import type { CandidateView, MyClip, Opening } from "@/lib/openings";
import { alertMeFor, renewOpening, setOpeningStatus, shareOpening } from "../actions";

/** Your opening's status with Pause / Filled / Renew, and who nearby fits, with reasons. */
export function OpeningPanel({ postId, opening, candidates, clips = [] }: { postId: number; opening: Opening; candidates?: CandidateView; clips?: MyClip[] }) {
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

      <ShareLink postId={postId} opening={opening} clips={clips} />

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

/**
 * The public link. Off until you turn it on; you pick the one clip it may play. What it shows
 * is spelled out, so nothing goes public by surprise.
 */
function ShareLink({ postId, opening, clips }: { postId: number; opening: Opening; clips: MyClip[] }) {
  const [clipId, setClipId] = useState<number | null>(opening.shareClipId ?? clips[0]?.id ?? null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const on = Boolean(opening.sharedAt);
  const url = typeof window === "undefined" ? `/o/${postId}` : `${window.location.origin}/o/${postId}`;
  const save = (next: boolean) =>
    start(async () => {
      const r = await shareOpening(postId, next, clipId);
      setError(r.error);
    });

  async function share() {
    const text = "We're looking for someone to play with. Have a listen:";
    if (navigator.share) await navigator.share({ url, text }).catch(() => {});
    else {
      await navigator.clipboard?.writeText(url).catch(() => {});
      setCopied(true);
    }
  }

  return (
    <div className="rounded-card bg-stage p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-callout font-semibold">Share link</span>
          <span className="text-footnote text-smoke">{on ? "Anyone with the link can see it, listen and answer." : "Off. Turn it on to post it anywhere."}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={pending || opening.status === "filled"}
          onClick={() => save(!on)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-tungsten" : "bg-riser"} disabled:opacity-50`}
        >
          <span className={`absolute top-1 size-6 rounded-full bg-paper transition-all ${on ? "left-7" : "left-1"}`} />
          <span className="sr-only">Share link</span>
        </button>
      </div>
      {clips.length > 0 ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-footnote text-smoke">Clip people can hear on the link</span>
          <select
            value={clipId ?? ""}
            onChange={(e) => setClipId(e.target.value ? Number(e.target.value) : null)}
            onBlur={() => on && save(true)}
            className="h-11 rounded-xl bg-riser px-3 text-callout"
          >
            {clips.map((c) => {
              const p = parseClip(c.url);
              return (
                <option key={c.id} value={c.id}>
                  {p ? PROVIDER_LABEL[p.provider] : "Clip"} · {c.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
                </option>
              );
            })}
            <option value="">No clip</option>
          </select>
        </label>
      ) : (
        <p className="text-footnote text-smoke">Add a clip to your profile so people can hear you on the link.</p>
      )}
      <p className="text-caption text-smoke">Shows: what you need, your area (not your address), rehearsal days, your first name and photo, and the clip you pick. Never your messages or contact details.</p>
      {on && (
        <button type="button" onClick={share} className="self-start h-9 px-3.5 rounded-full bg-paper text-ink text-footnote font-semibold">
          {copied ? "Link copied" : "Share the link"}
        </button>
      )}
      {error && <p className="text-footnote text-danger-soft">{error}</p>}
    </div>
  );
}
