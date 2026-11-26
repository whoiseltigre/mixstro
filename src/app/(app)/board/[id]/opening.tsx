"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { PersonPhoto } from "@/components/person-photo";
import { nounFor } from "@/lib/instruments";
import { statusLine } from "@/lib/opening-reasons";
import { PROVIDER_LABEL, parseClip } from "@/lib/clips";
import type { CandidateView, MyClip, Opening } from "@/lib/openings";
import { alertMeFor, renewOpening, setOpeningStatus, shareOpening } from "../actions";
import { Toggle } from "@/components/ui";

/** Your opening's status with Pause / Filled / Renew, and who nearby fits, with reasons. */
export function OpeningPanel({
  postId,
  opening,
  candidates,
  clips = [],
  title,
  area,
  justPosted = false,
}: {
  postId: number;
  opening: Opening;
  candidates?: CandidateView;
  clips?: MyClip[];
  title?: string;
  area?: string;
  justPosted?: boolean;
}) {
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

      <ShareLink postId={postId} opening={opening} clips={clips} title={title} area={area} justPosted={justPosted} />

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
 * is spelled out, so nothing goes public by surprise. Right after posting an opening this is the
 * next step: the musician you need is more likely in a local Facebook group or on Reddit than on
 * Mixstro yet, so it offers those first, with a post ready to paste.
 */
function ShareLink({ postId, opening, clips, title, area, justPosted }: { postId: number; opening: Opening; clips: MyClip[]; title?: string; area?: string; justPosted: boolean }) {
  const [clipId, setClipId] = useState<number | null>(opening.shareClipId ?? clips[0]?.id ?? null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState<"link" | "post" | null>(null);
  const [on, setOn] = useState(Boolean(opening.sharedAt));
  // The origin is only known in the browser; set after mount so the server and client render match.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/o/${postId}`;
  const save = (next: boolean) =>
    start(async () => {
      const r = await shareOpening(postId, next, clipId);
      setError(r.error);
      if (!r.error) setOn(next);
    });

  const who = nounFor(opening.neededRole);
  const where = area?.split(",")[0]?.trim();
  const post = sharePost({ who, where, days: opening.days, title });
  const encoded = encodeURIComponent(url);
  const targets = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${encoded}&title=${encodeURIComponent(post.headline)}` },
  ];

  async function copy(kind: "link" | "post") {
    await navigator.clipboard?.writeText(kind === "post" ? `${post.text}\n${url}` : url).catch(() => {});
    setCopied(kind);
  }
  async function more() {
    if (navigator.share) await navigator.share({ url, text: post.text }).catch(() => {});
    else await copy("link");
  }

  const featured = justPosted && opening.status !== "filled";

  return (
    <div className={`rounded-card p-4 flex flex-col gap-3 ${featured ? "bg-stage border border-gel-blue/40" : "bg-stage"}`}>
      {featured && (
        <div className="flex flex-col gap-1">
          <span className="text-caption font-semibold tracking-[0.14em] uppercase text-gel-blue">Posted. Now share it</span>
          <p className="text-subhead text-smoke text-pretty">
            The {who} you need might not be on Mixstro yet. Post your link in your city&apos;s &ldquo;musicians wanted&rdquo; Facebook group or on r/Bandmates, and they can listen and answer in one tap.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-callout font-semibold">Share link</span>
          <span className="text-footnote text-smoke">{on ? "Anyone with the link can see it, listen and answer." : "Off. Turn it on to post it anywhere."}</span>
        </span>
        <Toggle on={on} onChange={(v) => save(v)} label="Share link" disabled={pending || opening.status === "filled"} />
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
      {!on && featured && (
        <button type="button" disabled={pending} onClick={() => save(true)} className="self-start h-10 px-4 rounded-full bg-paper text-ink text-subhead font-semibold disabled:opacity-60">
          {pending ? "Turning on…" : "Turn on the link and share"}
        </button>
      )}
      {on && (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-xl bg-riser p-3 text-footnote text-paper/85 whitespace-pre-line">{post.text}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy("post")} className="h-9 px-3.5 rounded-full bg-paper text-ink text-footnote font-semibold">
              {copied === "post" ? "Post copied" : "Copy post"}
            </button>
            {targets.map((t) => (
              <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className="h-9 px-3.5 rounded-full border border-paper/20 text-footnote flex items-center hover:bg-paper/10 transition">
                {t.label}
              </a>
            ))}
            <button type="button" onClick={more} className="h-9 px-3.5 rounded-full border border-paper/20 text-footnote hover:bg-paper/10 transition">
              {copied === "link" ? "Link copied" : "More"}
            </button>
          </div>
          <p className="text-caption text-smoke">Tip: Facebook groups don&apos;t take shared links well, so copy the post and paste it in the group.</p>
        </div>
      )}
      {error && <p className="text-footnote text-danger-soft">{error}</p>}
    </div>
  );
}

/** A ready-to-paste post for a group or subreddit: plain, specific, no hype. */
export function sharePost({ who, where, days, title }: { who: string; where?: string; days: string[]; title?: string }) {
  const headline = `Looking for a ${who}${where ? ` in ${where}` : ""}`;
  const lines = [
    `${headline}.`,
    title && title.toLowerCase() !== headline.toLowerCase() ? (/[.!?]$/.test(title) ? title : `${title}.`) : null,
    days.length ? `We rehearse ${days.join("/")}.` : null,
    "Have a listen and answer here:",
  ].filter(Boolean);
  return { headline, text: lines.join("\n") };
}
