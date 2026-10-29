"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArtistAvatar } from "@/components/artist-avatar";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon } from "@/components/ui";
import { DEMO_TOP_ARTISTS, searchArtists } from "@/lib/artists";
import { type Artist, saveProfile, useDraft } from "@/lib/onboarding";

// Part of "finish your profile", reached from the Profile tab after onboarding.
const nav = { back: "/onboarding/music", next: "/me" };
const MIN = 3;
const MAX = 10;

export default function Influences() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const [q, setQ] = useState("");
  const [extra, setExtra] = useState<Artist[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save() {
    setSaving(true);
    const r = await saveProfile(draft);
    setSaving(false);
    if (r.error) return setError(r.error);
    router.push(nav.next);
  }

  const picked = draft.influences;
  const pickedIds = new Set(picked.map((a) => a.id));
  const suggestions = draft.musicSource === "manual" ? [] : DEMO_TOP_ARTISTS;
  const grid = dedupe([...picked, ...extra, ...suggestions]);
  const results = searchArtists(q).filter((a) => !pickedIds.has(a.id));

  function flip(a: Artist) {
    if (pickedIds.has(a.id)) update({ influences: picked.filter((p) => p.id !== a.id) });
    else if (picked.length < MAX) update({ influences: [...picked, a] });
  }

  function add(a: Artist) {
    setExtra((e) => dedupe([a, ...e]));
    if (!pickedIds.has(a.id) && picked.length < MAX) update({ influences: [...picked, a] });
    setQ("");
  }

  const source = draft.musicSource === "spotify" ? "Spotify" : "Apple Music";

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader back={nav.back} />
      <StepTitle
        title="Your influences"
        sub={
          draft.musicSource === "manual"
            ? "Add the artists that shape how you play. Pick at least three."
            : `We found these in ${source}. Keep the ones that shape how you play.`
        }
      />
      <div className="px-5 pt-6 flex flex-col gap-5">
        <div className="relative">
          <label htmlFor="artist-search" className="sr-only">Search artists</label>
          <input
            id="artist-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Add another artist"
            autoComplete="off"
            className="h-11 w-full rounded-xl bg-stage pl-10 pr-3 text-[16px] placeholder:text-smoke outline-none border border-transparent focus:border-paper/30"
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="absolute left-3.5 top-3.5 text-smoke" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          {results.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 top-12 glass rounded-2xl p-1.5 flex flex-col">
              {results.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => add(a)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-paper/5 text-left">
                    <ArtistAvatar artist={a} size={36} />
                    <span className="text-[15px]">{a.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-5">
          {grid.map((a) => {
            const on = pickedIds.has(a.id);
            return (
              <button key={a.id} type="button" aria-pressed={on} onClick={() => flip(a)} className="flex flex-col items-center gap-2">
                <span className={`relative rounded-full p-[2px] transition ${on ? "bg-paper" : "bg-transparent opacity-60"}`}>
                  <span className="block rounded-full border-2 border-ink">
                    <ArtistAvatar artist={a} size={88} />
                  </span>
                  {on && (
                    <span className="absolute right-0 bottom-0 size-7 rounded-full bg-paper text-ink border-2 border-ink flex items-center justify-center">
                      <CheckIcon size={13} />
                    </span>
                  )}
                </span>
                <span className={`text-[13px] text-center leading-tight ${on ? "font-semibold" : "text-smoke"}`}>{a.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <StepFooter>
        {picked.length < MIN && <p className="text-center text-[12px] text-smoke">Pick at least {MIN}</p>}
        {error && <p role="alert" className="text-center text-[13px] text-[#FF453A]">{error}</p>}
        <Button disabled={picked.length < MIN || saving} onClick={save}>
          {saving ? "Saving…" : `Save${picked.length ? ` · ${picked.length} picked` : ""}`}
        </Button>
      </StepFooter>
    </main>
  );
}

function dedupe(list: Artist[]) {
  const seen = new Set<string>();
  return list.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}
