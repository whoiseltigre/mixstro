"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { connect, connectReady } from "@/app/(app)/actions";
import type { Musician } from "@/lib/mock";

const MAX = 280;

/** Three openers written for this person: one tap sends one. */
export function openers(m: Pick<Musician, "name" | "instrument" | "shared">): string[] {
  const first = m.name.split(" ")[0];
  const plays = m.instrument && m.instrument !== "Musician" ? m.instrument.toLowerCase() : "";
  return [
    m.shared.length
      ? `Fellow ${m.shared[0].name} fan here. Want to get together and play sometime?`
      : `Hey ${first}, I like your sound. Want to get together and play sometime?`,
    plays
      ? `I'm putting something together and could use ${/^[aeiou]/.test(plays) ? "an" : "a"} ${plays} player. Interested?`
      : `I'm putting a project together. Would you be up for trying a few songs?`,
    `Would love to hear what you're working on. Open to a jam this month?`,
  ];
}

/**
 * The Connect sheet: every Connect carries a short note. Pick an opener (one tap sends it)
 * or write your own. If you have no song on your profile yet, it asks you to add one first,
 * because musicians answer people they can hear.
 */
export function ConnectSheet({ person, onClose, onSent }: { person: Musician; onClose: () => void; onSent: () => void }) {
  const first = person.name.split(" ")[0];
  const [ready, setReady] = useState<boolean | null>(null);
  const [own, setOwn] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    connectReady().then((r) => setReady(r.hasMusic), () => setReady(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = (note: string) =>
    start(async () => {
      setError("");
      const res = await connect(person.id, person.username, note);
      if (res && "needSong" in res && res.needSong) return setReady(false);
      if (res && "error" in res && res.error) return setError(res.error);
      if (res && "sent" in res && res.sent) onSent();
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="connect-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />
      <div className="relative w-full md:max-w-[480px] max-h-[92dvh] overflow-y-auto rounded-t-[28px] md:rounded-[28px] bg-stage border border-paper/10 px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="connect-title" className="text-[20px] font-semibold">
            {ready === false ? "Add a song first" : `Say hi to ${first}`}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="size-9 shrink-0 rounded-full bg-paper/8 flex items-center justify-center hover:bg-paper/14">
            <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" /></svg>
          </button>
        </div>

        {ready === null && <p className="text-[14px] text-smoke py-6">One sec…</p>}

        {ready === false && (
          <>
            <p className="text-[15px] text-smoke text-pretty">
              Musicians answer people they can hear. Add one song, a clip or a track from a band you&apos;ve played in, and your Connect to {first} is one tap away.
            </p>
            <Link href="/me/projects" className="h-12 rounded-full bg-paper text-ink text-[16px] font-semibold flex items-center justify-center">
              Add a song
            </Link>
            <Link href="/onboarding/sound" className="text-center text-[14px] font-semibold underline underline-offset-4">
              Or paste a clip link
            </Link>
          </>
        )}

        {ready && (
          <>
            <p className="text-[14px] text-smoke -mt-2">A short note gets far more replies than a blank request. Tap one to send it.</p>
            <ul className="flex flex-col gap-2">
              {openers(person).map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => send(o)}
                    className="w-full text-left p-3.5 rounded-[18px] bg-ink/60 border border-paper/10 text-[15px] leading-[1.4] transition hover:border-tungsten/70 disabled:opacity-50 flex items-center gap-3"
                  >
                    <span className="flex-1">{o}</span>
                    <span className="shrink-0 text-[13px] font-semibold text-tungsten">Send</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 pt-1">
              <label htmlFor="connect-note" className="text-[13px] font-semibold text-smoke">Or write your own</label>
              <textarea
                id="connect-note"
                value={own}
                onChange={(e) => setOwn(e.target.value)}
                maxLength={MAX}
                rows={3}
                placeholder={`What would you like to play with ${first}?`}
                className="rounded-[18px] bg-ink border border-paper/12 p-3.5 text-[16px] leading-[1.45] placeholder:text-smoke/70 outline-none focus:border-paper/45 resize-none"
              />
              <button
                type="button"
                disabled={pending || own.trim().length < 2}
                onClick={() => send(own)}
                className="h-12 rounded-full bg-paper text-ink text-[16px] font-semibold disabled:opacity-40"
              >
                {pending ? "Sending…" : "Send Connect"}
              </button>
            </div>
            {error && <p role="alert" className="text-[13px] text-[#FF453A]">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
