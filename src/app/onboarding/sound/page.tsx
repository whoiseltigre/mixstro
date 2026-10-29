"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipCard } from "@/components/clip-card";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, SectionLabel } from "@/components/ui";
import { parseClip } from "@/lib/clips";
import { stepNav, useDraft } from "@/lib/onboarding";

const nav = stepNav("sound");
const MAX_CLIPS = 6;

export default function Sound() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const [link, setLink] = useState("");
  const [band, setBand] = useState("");
  const [error, setError] = useState<string>();

  const clips = draft.clips.filter((c) => c.kind === "clip");
  const bands = draft.clips.filter((c) => c.kind === "band");

  function addClip(raw: string) {
    const parsed = parseClip(raw);
    if (!parsed) return setError("That link isn't one we can play yet. Try YouTube, TikTok, Instagram, SoundCloud, Spotify or Apple Music.");
    if (clips.some((c) => parseClip(c.value)?.id === parsed.id)) return setError("You already added that one.");
    setError(undefined);
    update({ clips: [...draft.clips, { kind: "clip", value: parsed.url }] });
    setLink("");
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} />
      <StepTitle title="Show how you sound" sub="Paste a link from YouTube, TikTok, Instagram, SoundCloud, Spotify or Apple Music. It plays right on your profile." />
      <div className="px-5 pt-7 flex flex-col gap-7">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addClip(link);
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="clip-link" className="text-[13px] font-semibold text-smoke">
            Clip link
          </label>
          <div className="flex gap-2">
            <input
              id="clip-link"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setError(undefined);
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (parseClip(text)) {
                  e.preventDefault();
                  addClip(text);
                }
              }}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="Paste a link"
              disabled={clips.length >= MAX_CLIPS}
              className="flex-1 min-w-0 h-[52px] rounded-2xl bg-stage border border-paper/12 px-4 text-[16px] placeholder:text-smoke/60 outline-none focus:border-paper/50"
            />
            <button type="submit" disabled={!link.trim()} className="h-[52px] px-5 rounded-2xl bg-paper text-ink font-semibold disabled:opacity-40">
              Add
            </button>
          </div>
          {error && <p role="alert" className="text-[13px] text-[#FF453A]">{error}</p>}
        </form>

        {clips.length > 0 && (
          <div className="hscroll flex gap-2.5 -mx-5 px-5 items-start">
            {clips.map((c) => {
              const parsed = parseClip(c.value);
              return parsed ? (
                <ClipCard key={c.value} clip={parsed} onRemove={() => update({ clips: draft.clips.filter((x) => x !== c) })} />
              ) : null;
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <SectionLabel>Bands you play in (optional)</SectionLabel>
          {bands.map((b) => (
            <div key={b.value} className="flex items-center justify-between px-4 h-12 rounded-2xl bg-stage">
              <span className="text-[15px]">{b.value}</span>
              <button type="button" onClick={() => update({ clips: draft.clips.filter((x) => x !== b) })} className="text-[13px] text-smoke">
                Remove
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!band.trim()) return;
              update({ clips: [...draft.clips, { kind: "band", value: band.trim() }] });
              setBand("");
            }}
            className="flex gap-2"
          >
            <label htmlFor="band" className="sr-only">Band name</label>
            <input
              id="band"
              value={band}
              onChange={(e) => setBand(e.target.value)}
              placeholder="Band name"
              className="flex-1 min-w-0 h-12 rounded-2xl bg-stage border border-paper/12 px-4 text-[16px] placeholder:text-smoke/60 outline-none focus:border-paper/50"
            />
            <button type="submit" disabled={!band.trim()} className="h-12 px-4 rounded-2xl glass font-semibold disabled:opacity-40">
              Add
            </button>
          </form>
        </div>
      </div>
      <StepFooter>
        <Button onClick={() => router.push(nav.next)}>{clips.length ? "Finish" : "Skip for now"}</Button>
      </StepFooter>
    </main>
  );
}
