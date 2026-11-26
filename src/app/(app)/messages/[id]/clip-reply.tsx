"use client";

import { useState } from "react";
import { usePlayer } from "@/components/player";
import { FadeImg } from "@/components/fade-image";
import { Sheet, useSheetClose } from "@/components/sheet";
import { Button, Field } from "@/components/ui";
import { PROVIDER_LABEL, parseClip } from "@/lib/clips";
import { boundClipAt, clipTime, parseClipTime } from "@/lib/clip-reply";
import type { ChatClip, ClipOption } from "@/lib/people";

export type Attachment = { id: number; at: number | null };

const NOTE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);

/**
 * A clip reply in the chat: the clip, the moment ("at 1:23") and any note. Tapping plays it in
 * the Mixstro player from that moment (recordings and YouTube; song previews start at the top).
 * A clip that was removed shows as unavailable and the rest of the message stays readable.
 */
export function ClipBubble({ clip, body, mine, first, faded }: { clip: ChatClip; body: string | null; mine: boolean; first: string; faded?: number }) {
  const player = usePlayer();
  const parsed = clip.available && clip.url ? parseClip(clip.url) : null;
  const provider = clip.provider ?? parsed?.provider ?? null;
  const owner = clip.mine === undefined ? "A clip" : clip.mine ? "Your clip" : `${first}'s clip`;
  const align = mine ? "self-end items-end" : "self-start items-start";

  return (
    <div className={`max-w-[78%] flex flex-col gap-1 ${align}`} style={faded ? { opacity: faded } : undefined}>
      {clip.available && clip.url && provider ? (
        <button
          type="button"
          onClick={() => player?.play({ id: `clip-${clip.id}`, url: clip.url!, provider, title: owner, sub: PROVIDER_LABEL[provider], artwork: parsed?.thumb, at: clip.at })}
          aria-label={`Play ${owner.toLowerCase()}${clip.at != null ? ` from ${clipTime(clip.at)}` : ""}`}
          className="press w-[240px] rounded-tile overflow-hidden bg-riser border border-paper/10 text-left flex items-center gap-3 p-2 pr-3"
        >
          <span className="relative size-14 rounded-xl overflow-hidden shrink-0 bg-stage flex items-center justify-center">
            {parsed?.thumb ? <FadeImg src={parsed.thumb} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="text-gel-teal">{NOTE}</span>}
            <span className="relative glass size-8 rounded-full flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4l13 8-13 8z" />
              </svg>
            </span>
          </span>
          <span className="min-w-0 flex flex-col gap-0.5">
            <span className="text-subhead font-semibold truncate">{owner}</span>
            <span className="text-caption text-smoke truncate">{PROVIDER_LABEL[provider]}</span>
            {clip.at != null && <span className="self-start mt-0.5 text-caption2 font-semibold px-2 py-0.5 rounded-full bg-gel-teal/15 text-gel-teal tabular-nums">at {clipTime(clip.at)}</span>}
          </span>
        </button>
      ) : (
        <div className="w-[240px] rounded-tile border border-dashed border-paper/20 px-3.5 py-3 flex items-center gap-2.5 text-footnote text-smoke">
          <span aria-hidden="true">{NOTE}</span>
          This clip is no longer available
        </div>
      )}
      {body && (
        <div
          className={
            mine
              ? "px-3.5 py-2.5 rounded-[20px_20px_6px_20px] bubble-own text-callout leading-[1.4] whitespace-pre-wrap break-words"
              : "px-3.5 py-2.5 rounded-[20px_20px_20px_6px] bg-stage text-callout leading-[1.4] whitespace-pre-wrap break-words"
          }
        >
          {body}
        </div>
      )}
    </div>
  );
}

/** The clip waiting to go with the next send, above the message box. */
export function AttachmentChip({ option, at, first, onRemove }: { option: ClipOption; at: number | null; first: string; onRemove: () => void }) {
  return (
    <div className="glass fixed md:absolute z-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4 bottom-[calc(max(env(safe-area-inset-bottom),16px)+62px)] md:bottom-[78px] h-9 rounded-full flex items-center gap-2 pl-3 pr-1 text-footnote whitespace-nowrap">
      <span className="text-gel-teal">{NOTE}</span>
      <span className="font-semibold">{option.mine ? "Your clip" : `${first}'s clip`}</span>
      {at != null && <span className="text-smoke tabular-nums">at {clipTime(at)}</span>}
      <button type="button" onClick={onRemove} aria-label="Remove clip" className="hit-slop relative size-7 rounded-full bg-paper/12 flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/** Pick one of their clips (or yours) and, if you like, the moment you mean. */
export function ClipPickerSheet(props: { options: ClipOption[]; first: string; onPick: (a: Attachment) => void; onClose: () => void }) {
  return (
    <Sheet
      onClose={props.onClose}
      z="z-40"
      labelledBy="clip-pick-title"
      scrimClassName="bg-ink/70"
      className="md:max-w-[440px] rounded-t-sheet md:rounded-sheet bg-stage border border-paper/10"
    >
      <ClipPicker {...props} />
    </Sheet>
  );
}

function ClipPicker({ options, first, onPick }: { options: ClipOption[]; first: string; onPick: (a: Attachment) => void }) {
  const close = useSheetClose();
  const [chosen, setChosen] = useState<number | null>(options.find((o) => !o.mine)?.id ?? options[0]?.id ?? null);
  const [time, setTime] = useState("");
  const [error, setError] = useState<string>();
  const theirs = options.filter((o) => !o.mine);
  const yours = options.filter((o) => o.mine);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const option = options.find((o) => o.id === chosen);
    if (!option) return setError("Pick a clip.");
    const parsed = parseClipTime(time);
    const at = parsed === "invalid" ? "invalid" : boundClipAt(parsed, option.duration);
    if (at === "invalid") return setError(option.duration ? `Pick a moment up to ${clipTime(option.duration)}.` : "Write the moment like 1:23.");
    onPick({ id: option.id, at });
    close();
  }

  const row = (o: ClipOption) => {
    const p = parseClip(o.url);
    const provider = o.provider ?? p?.provider;
    return (
      <label key={o.id} className="flex items-center gap-3 p-2 rounded-2xl has-[:checked]:bg-paper/10 cursor-pointer">
        <input type="radio" name="clip" value={o.id} checked={chosen === o.id} onChange={() => setChosen(o.id)} className="sr-only" />
        <span className="relative size-12 rounded-xl overflow-hidden shrink-0 bg-riser flex items-center justify-center text-gel-teal">
          {p?.thumb ? <FadeImg src={p.thumb} alt="" className="absolute inset-0 size-full object-cover" /> : NOTE}
        </span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-subhead font-semibold truncate">{provider ? PROVIDER_LABEL[provider] : "Clip"}</span>
          <span className="text-caption text-smoke truncate">{o.duration ? clipTime(o.duration) : new URL(o.url, "https://mixstro.com").hostname.replace(/^www\./, "")}</span>
        </span>
        <span aria-hidden="true" className={`size-5 rounded-full border-2 ${chosen === o.id ? "border-paper bg-paper" : "border-paper/30"}`} />
      </label>
    );
  };

  return (
    <form onSubmit={submit} className="p-5 pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col gap-4" aria-labelledby="clip-pick-title">
      <h2 id="clip-pick-title" className="text-title3 font-semibold tracking-[-0.01em]">
        Reply to a clip
      </h2>
      <div className="max-h-[42dvh] overflow-y-auto flex flex-col gap-1" role="radiogroup" aria-label="Clips">
        {theirs.length > 0 && <p className="text-caption font-semibold text-smoke uppercase tracking-[0.06em] px-2 pt-1">{first}&apos;s clips</p>}
        {theirs.map(row)}
        {yours.length > 0 && <p className="text-caption font-semibold text-smoke uppercase tracking-[0.06em] px-2 pt-3">Yours</p>}
        {yours.map(row)}
      </div>
      <Field id="clip-at" label="At a moment (optional)" placeholder="1:23" inputMode="numeric" value={time} onChange={(e) => setTime(e.target.value)} />
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
      <Button type="submit">Attach clip</Button>
    </form>
  );
}
