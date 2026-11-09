"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipCard } from "@/components/clip-card";
import { ClipRecorder } from "@/components/clip-recorder";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, cx } from "@/components/ui";
import { parseClip } from "@/lib/clips";
import { lookupTrack } from "@/app/(app)/me/projects/actions";
import { STEP_GLOW, saveProfile, useDraft } from "@/lib/onboarding";

// "Add a track" from "Finish your profile" (no longer a signup step).
const MAX_CLIPS = 6;
const PLATFORMS = ["YouTube", "SoundCloud", "Spotify", "Apple Music", "TikTok", "Instagram"];

export default function Sound() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const clips = draft.clips.filter((c) => c.kind === "clip");
  const full = clips.length >= MAX_CLIPS;
  const valid = Boolean(link.trim() && parseClip(link));

  function addClip(raw: string) {
    if (!raw.trim()) return;
    const parsed = parseClip(raw);
    if (!parsed) return setError("We can't play that link yet. Try YouTube, SoundCloud, Spotify, Apple Music, Bandcamp, TikTok or Instagram.");
    if (clips.some((c) => parseClip(c.value)?.id === parsed.id)) return setError("You already added that one.");
    setError(undefined);
    update({ clips: [...draft.clips, { kind: "clip", value: parsed.url }] });
    setLink("");
    // Bandcamp's player needs an id that only the page has; swap it in once we know it.
    if (!parsed.embed) {
      lookupTrack(parsed.url)
        .then(({ url }) => url && update((d) => ({ clips: d.clips.map((c) => (c.value === parsed.url ? { ...c, value: url } : c)) })))
        .catch(() => {});
    }
  }

  async function finish() {
    setSaving(true);
    const r = await saveProfile(draft);
    setSaving(false);
    if (r.error) return setError(r.error);
    router.push("/me");
  }

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader back="/me" glow={STEP_GLOW.sound} />
      <StepTitle title="Let people hear you" sub="One track is enough, new or from years back. It plays right on your profile." />
      <div className="px-5 pt-7 flex flex-col gap-6">
        {clips.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] font-semibold text-smoke flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-tungsten text-ink flex items-center justify-center"><CheckIcon size={9} /></span>
              {clips.length === 1 ? "1 track on your profile" : `${clips.length} tracks on your profile`}
            </p>
            <div className="hscroll flex gap-2.5 -mx-5 px-5 items-start">
              {clips.map((c) => {
                const parsed = parseClip(c.value);
                return parsed ? (
                  <ClipCard key={c.value} clip={parsed} onRemove={() => update({ clips: draft.clips.filter((x) => x !== c) })} />
                ) : null;
              })}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addClip(link);
          }}
          className="flex flex-col gap-2.5"
        >
          <label htmlFor="clip-link" className="text-[13px] font-semibold text-smoke">
            Paste a link to your music
          </label>
          <div
            className={cx(
              "flex items-center gap-2 h-[56px] pl-4 pr-1.5 rounded-full bg-stage border transition focus-within:border-paper/50",
              error ? "border-[#FF453A]/70" : valid ? "border-tungsten" : "border-paper/12",
            )}
          >
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
              enterKeyHint="done"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={full ? "That's the max for now" : "youtube.com/watch?v=…"}
              disabled={full}
              className="flex-1 min-w-0 h-full bg-transparent text-[16px] placeholder:text-smoke/50 outline-none"
            />
            <button
              type="submit"
              disabled={!link.trim()}
              className={cx(
                "h-11 px-5 rounded-full font-semibold text-[15px] transition active:scale-95 disabled:opacity-0",
                valid ? "bg-tungsten text-ink" : "bg-paper text-ink",
              )}
            >
              Add
            </button>
          </div>
          {error ? (
            <p role="alert" className="text-[13px] text-[#FF8A80] px-1">{error}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <span key={p} className="text-[12px] text-smoke px-2.5 py-1 rounded-full bg-paper/6">{p}</span>
              ))}
            </div>
          )}
        </form>

        <div className="flex items-center gap-3 text-[12px] text-smoke/70" aria-hidden="true">
          <span className="flex-1 h-px bg-paper/10" />
          or
          <span className="flex-1 h-px bg-paper/10" />
        </div>

        <ClipRecorder disabled={full} onSaved={(url) => update({ clips: [...draft.clips, { kind: "clip", value: url }] })} />
      </div>
      <StepFooter>
        <Button disabled={!clips.length || saving} onClick={finish}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </StepFooter>
    </main>
  );
}
