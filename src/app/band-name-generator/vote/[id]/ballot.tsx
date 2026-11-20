"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Ballot, Kind } from "@/lib/band-names/ballots";
import { api, rememberVote, shareText, startBandUrl, track } from "@/lib/band-names/client";
import { shareStory, storyCard } from "@/lib/band-names/story-card";

const QUESTION: Record<Kind, string> = { band: "Pick our band name", single: "Pick our next single", closer: "Pick our set closer" };
const LETTER = ["A", "B", "C"];
const HUE = ["var(--tungsten)", "var(--pink)", "var(--blue)"];

const winner = (counts: number[]) => {
  const top = Math.max(...counts);
  return top === 0 ? -1 : counts.filter((c) => c === top).length > 1 ? -2 : counts.indexOf(top);
};

export function BallotView({ initial }: { initial: Ballot }) {
  const [b, setB] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [story, setStory] = useState<string>();
  const [asking, setAsking] = useState(false);
  const [kind, setKind] = useState<Kind>("single");
  const [next, setNext] = useState(["", "", ""]);
  const url = typeof window === "undefined" ? "" : `${location.origin}/band-name-generator/vote/${b.id}`;
  const total = b.counts ? b.counts.reduce((a, c) => a + c, 0) : 0;
  const voted = b.choice !== null;

  useEffect(() => rememberVote(b.id, b.options.join(" · ")), [b.id, b.options]);

  async function refresh() {
    try {
      const r = await api<{ ballot: Ballot }>({ action: "get", id: b.id });
      setB(r.ballot);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function vote(choice: number) {
    if (busy || choice === b.choice) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ ballot: Ballot }>({ action: "vote", id: b.id, round: b.round, choice });
      setB(r.ballot);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const r = await shareText(QUESTION[b.kind], `${QUESTION[b.kind]}: ${b.options.join(", ")}. Vote here:`, url);
    if (r === "copied") setNote("Link copied. Paste it in the band chat.");
    else if (r !== "shared") setNote(r);
  }

  async function makeStory() {
    setNote("");
    try {
      // A vote link is too long to read off a story, so the image points at the link sticker and the link goes on the clipboard.
      const blob = await storyCard({ question: QUESTION[b.kind], options: b.options, link: `${location.host}/band-name-generator`, footer: "Vote with the link sticker. No sign-up." });
      track("bng_story");
      const copied = await navigator.clipboard?.writeText(url).then(() => true, () => false);
      if (copied) setNote("Vote link copied. Add it to the story as a link sticker.");
      const r = await shareStory(blob, QUESTION[b.kind]);
      if (r !== "shared" && r !== "cancelled") setStory(r);
    } catch {
      setNote("Couldn't make the image on this browser.");
    }
  }

  async function openRound(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ ballot: Ballot }>({ action: "round", id: b.id, round: b.round, kind, options: next });
      setB(r.ballot);
      setAsking(false);
      setNext(["", "", ""]);
      setNote("New round is open on the same link. Share it again.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bng-vote">
      <header className="mxb-post-hero">
        <nav className="mxb-crumb" aria-label="Breadcrumb">
          <Link href="/band-name-generator">Band name generator</Link>
          <span aria-hidden="true">/</span>
          <span>Band vote{b.round > 1 ? ` · Round ${b.round}` : ""}</span>
        </nav>
        <h1>{QUESTION[b.kind]}</h1>
        <p className="dek">{voted ? "Thanks. Tap another to change your vote." : "Tap your favorite. No sign-up, and only totals are shown."}</p>
      </header>

      <ul className="bng-options" aria-label="Options">
        {b.options.map((name, i) => {
          const n = b.counts?.[i] ?? 0;
          const share = total ? Math.round((n / total) * 100) : 0;
          const mine = b.choice === i;
          return (
            <li key={name}>
              <button type="button" className="bng-option" aria-pressed={mine} disabled={busy} onClick={() => vote(i)} style={{ "--hue": HUE[i] } as React.CSSProperties}>
                {b.counts && <span className="bar" style={{ width: `${share}%` }} aria-hidden="true" />}
                <b className="letter" aria-hidden="true">{LETTER[i]}</b>
                <span className="name">{name}</span>
                {b.counts && (
                  <span className="tally">
                    {share}% <small>({n})</small>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="bng-hint" aria-live="polite">
        {b.voters === 0 ? "No votes yet." : `${b.voters} ${b.voters === 1 ? "vote" : "votes"} so far.`}{" "}
        <button type="button" className="bng-link quiet" onClick={refresh}>Refresh</button>
      </p>
      {error && (
        <p className="bng-error center" role="alert">
          {error}
        </p>
      )}

      <section className="bng-panel bng-short">
        <h2>{b.organizer ? "Get the band voting" : "Spread the word"}</h2>
        <div className="bng-cta">
          <button type="button" className="mxb-btn paper sm" onClick={share}>Share the vote</button>
          <button type="button" className="mxb-btn ghost sm" onClick={makeStory}>Make a story image</button>
          {b.organizer && !asking && (
            <button type="button" className="mxb-btn ghost sm" onClick={() => setAsking(true)}>Ask another question</button>
          )}
        </div>
        {note && <p className="bng-note" aria-live="polite">{note}</p>}
        {story && (
          <p className="bng-note">
            {/* A blob URL from this page: opening it shows the image to save or share. */}
            <a className="bng-link" href={story} target="_blank" rel="noopener">Open the story image</a> and save it to your photos.
          </p>
        )}

        {asking && (
          <form className="bng-round" onSubmit={openRound}>
            <p className="bng-small">Closes this round (its totals stay below) and asks a new question on the same link.</p>
            <fieldset className="bng-seg" aria-label="Question">
              {(["band", "single", "closer"] as Kind[]).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
                  {k === "band" ? "Band name" : k === "single" ? "Next single" : "Set closer"}
                </button>
              ))}
            </fieldset>
            {next.map((v, i) => (
              <label key={i} className="bng-field">
                <span>Option {LETTER[i]}</span>
                <input id={`bng-round-${i}`} value={v} maxLength={80} onChange={(e) => setNext((n) => n.map((x, j) => (j === i ? e.target.value : x)))} />
              </label>
            ))}
            <div className="bng-cta">
              <button type="submit" className="mxb-btn paper sm" disabled={busy || next.some((v) => !v.trim())}>Open the new round</button>
              <button type="button" className="mxb-btn ghost sm" onClick={() => setAsking(false)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      {b.history.length > 0 && (
        <section className="bng-panel bng-history" aria-labelledby="bng-past">
          <h2 id="bng-past">Past rounds</h2>
          <ol>
            {[...b.history].reverse().map((h) => {
              const w = winner(h.counts);
              const votes = h.counts.reduce((a, c) => a + c, 0);
              return (
                <li key={h.round}>
                  <span className="bng-small">Round {h.round} · {QUESTION[h.kind]} · {votes} {votes === 1 ? "vote" : "votes"}</span>
                  <strong>{w >= 0 ? h.options[w] : w === -2 ? "A tie" : "No votes"}</strong>
                  <span className="bng-small">{h.options.map((o, i) => `${o} ${h.counts[i]}`).join(" · ")}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="mxb-join">
        <h2>{b.kind === "band" ? "Got a name? Put the band on Mixstro." : "Put the band on Mixstro."}</h2>
        <p>Every band you&apos;ve played in on one page, and the people for the next one. Free.</p>
        <a className="mxb-btn paper" href={startBandUrl(b.kind === "band" && b.counts ? b.options[Math.max(0, winner(b.counts))] : undefined)} onClick={() => track("bng_signup_click")}>
          Claim your free profile
        </a>
        <p className="bng-small" style={{ marginTop: 18 }}>
          Need names first? <Link className="bng-link" href="/band-name-generator">Try the band name generator</Link>
        </p>
      </section>
    </div>
  );
}
