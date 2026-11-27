"use client";

import { useEffect, useState, useTransition } from "react";
import { ClipCard } from "@/components/clip-card";
import { parseClip } from "@/lib/clips";
import { RETURN_COOKIE } from "@/lib/return-path";
import { replyToOpening, type ReplyOutcome } from "../actions";

const draftKey = (id: number) => `mx_opening_draft:${id}`;

function readDraft(id: number) {
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return "";
    const { text, at } = JSON.parse(raw) as { text: string; at: number };
    // A note kept through sign-in lasts a day, then it's gone.
    return Date.now() - at < 86_400_000 ? text : "";
  } catch {
    return "";
  }
}
function writeDraft(id: number, text: string) {
  try {
    if (text) localStorage.setItem(draftKey(id), JSON.stringify({ text, at: Date.now() }));
    else localStorage.removeItem(draftKey(id));
  } catch {}
}

const count = (id: number, kind: "open" | "listen") =>
  fetch("/api/openings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind }), keepalive: true }).catch(() => {});

/** The clip, counted once when played. */
export function OpeningClip({ id, url, label }: { id: number; url: string; label: string }) {
  const clip = parseClip(url);
  const [counted, setCounted] = useState(false);
  useEffect(() => {
    void count(id, "open");
  }, [id]);
  if (!clip) return null;
  return (
    <div
      className="flex flex-col gap-2"
      onClickCapture={() => {
        if (!counted) {
          setCounted(true);
          void count(id, "listen");
        }
      }}
    >
      <span className="text-footnote font-semibold text-smoke">{label}</span>
      <ClipCard clip={clip} />
    </div>
  );
}

const MESSAGES: Record<ReplyOutcome["outcome"], string> = {
  sent: "Sent. They'll see your profile and note, and you're at the top of their Today.",
  already: "You already answered this one. They have your profile.",
  closed: "This opening isn't open anymore, so your note wasn't sent. It's still here if you want to keep it.",
  signed_out: "You're signed out. Sign in and you'll come right back here.",
  own: "This is your opening. Share the link with musicians you'd like to hear from.",
  unavailable: "You can't answer this one.",
  error: "That didn't send. Try again.",
};

/**
 * "I play drums: answer Lena". Signed out, the note is kept on this device and sign-in brings you
 * back to this same opening (never anywhere else) to press Send yourself, so returning can't
 * send it twice. Every rule is checked again when you send.
 */
export function ReplyBox({ id, cta, first, signedIn, open, answered }: { id: number; cta: string; first: string; signedIn: boolean; open: boolean; answered: boolean }) {
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ReplyOutcome | null>(answered ? { outcome: "already" } : null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const kept = readDraft(id);
    if (kept) {
      setNote(kept);
      setWriting(true);
    }
  }, [id]);

  if (!open) return null;
  const done = result?.outcome === "sent" || result?.outcome === "already";

  function signInFirst() {
    writeDraft(id, note);
    document.cookie = `${RETURN_COOKIE}=/o/${id}; path=/; max-age=3600; samesite=lax`;
    window.location.assign("/");
  }

  function send() {
    writeDraft(id, note);
    start(async () => {
      const r = await replyToOpening(id, note).catch((): ReplyOutcome => ({ outcome: "error" }));
      setResult(r);
      if (r.outcome === "sent" || r.outcome === "already") writeDraft(id, "");
    });
  }

  if (done) {
    return <p role="status" className="rounded-card bg-stage p-4 text-callout">{MESSAGES[result!.outcome]}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {!writing ? (
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="press h-14 rounded-full bg-paper text-ink text-body-lg font-semibold"
        >
          {cta}: answer {first}
        </button>
      ) : (
        <>
          <label htmlFor="note" className="text-footnote font-semibold text-smoke">
            A short note for {first} (optional)
          </label>
          <textarea
            id="note"
            value={note}
            maxLength={280}
            rows={3}
            onChange={(e) => {
              setNote(e.target.value);
              writeDraft(id, e.target.value);
            }}
            placeholder="I can do Thursdays. Here's what I've been playing…"
            className="field px-4 py-3 text-body-lg leading-[1.45] resize-none"
          />
          {signedIn ? (
            <button type="button" disabled={pending} onClick={send} className="press h-14 rounded-full bg-paper text-ink text-body-lg font-semibold disabled:opacity-60">
              {pending ? "Sending…" : `Send to ${first}`}
            </button>
          ) : (
            <>
              <button type="button" onClick={signInFirst} className="press h-14 rounded-full bg-paper text-ink text-body-lg font-semibold">
                Sign in to send
              </button>
              <p className="text-footnote text-smoke">Free. Your note stays on this phone, and you&rsquo;ll come straight back here to send it.</p>
            </>
          )}
        </>
      )}
      {result && <p role="alert" className="text-footnote text-danger-soft">{MESSAGES[result.outcome]}</p>}
    </div>
  );
}
