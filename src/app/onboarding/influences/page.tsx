"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtistAvatar } from "@/components/artist-avatar";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon } from "@/components/ui";
import { searchArtists } from "@/lib/artists";
import { type Artist, type Draft, STEP_GLOW, saveProfile, stepNav, useDraft } from "@/lib/onboarding";

// A signup step ("Who do you sound like?"), and also reachable from the Profile tab (?from=profile).
const GLOW = STEP_GLOW.influences;
const MIN = 3;
const MAX = 10;

export default function Influences() {
  const router = useRouter();
  const [fromProfile, setFromProfile] = useState(false);
  useEffect(() => setFromProfile(new URLSearchParams(location.search).get("from") === "profile"), []);
  const { draft, update } = useDraft();
  const nav = stepNav("influences", draft);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save() {
    if (!fromProfile) return router.push(nav.next);
    setSaving(true);
    const r = await saveProfile(draft);
    setSaving(false);
    if (r.error) return setError(r.error);
    router.push("/me");
  }

  const picked = draft.influences;
  const pickedIds = new Set(picked.map((a) => a.id));
  const results = useArtistSearch(q).filter((a) => !pickedIds.has(a.id));
  // Spotify-style: every artist you pick brings in a row of artists like them, newest first.
  const [groups, setGroups] = useState<{ from: Artist; artists: Artist[] }[]>([]);
  const asked = useRef(new Set<string>());

  const loadSimilar = useCallback(async (a: Artist) => {
    if (asked.current.has(a.id)) return;
    asked.current.add(a.id);
    try {
      const res = await fetch(`/api/artists/related?name=${encodeURIComponent(a.name)}`);
      const body = (await res.json()) as { artists?: Artist[] };
      const artists = (body.artists ?? []).slice(0, 9);
      if (artists.length) setGroups((g) => [{ from: a, artists }, ...g.filter((x) => x.from.id !== a.id)].slice(0, 4));
    } catch {
      // No suggestions this time: search still works.
    }
  }, []);

  // Coming back to this step: bring back suggestions for your latest picks.
  useEffect(() => {
    picked.slice(-2).forEach((a) => loadSimilar(a));
    // Only once the saved picks have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked.length > 0, loadSimilar]);

  function flip(a: Artist) {
    try {
      navigator.vibrate?.(8);
    } catch {}
    if (pickedIds.has(a.id)) update({ influences: picked.filter((p) => p.id !== a.id) });
    else if (picked.length < MAX) {
      update({ influences: [...picked, a] });
      loadSimilar(a);
    }
  }

  function add(a: Artist) {
    if (!pickedIds.has(a.id)) flip(a);
    setQ("");
  }

  return (
    <main className="min-h-dvh flex flex-col isolate">
      {fromProfile ? <StepHeader back="/me" glow={GLOW} /> : <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={GLOW} />}
      <StepTitle
        eyebrow="Your influences"
        color={GLOW}
        title={draft.signupAs === "band" && draft.band?.name ? `Who does ${draft.band.name} sound like?` : "Who inspires you?"}
        sub={
          draft.signupAs === "band"
            ? "The artists your band gets compared to, or wants to be. We'll line up similar ones, and introduce you to musicians who love them too."
            : "The artists you grew up on, play like, or can't stop playing. We'll line up similar ones, and introduce you to musicians who love them too."
        }
      />
      <div className="px-5 pt-6 flex flex-col gap-6">
        <div className="relative z-10">
          <label htmlFor="artist-search" className="sr-only">Search artists</label>
          <input
            id="artist-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any artist or band"
            autoComplete="off"
            className="h-[52px] w-full rounded-2xl bg-stage pl-11 pr-3 text-[16px] placeholder:text-smoke outline-none border border-paper/10 focus:border-[var(--glow)] transition"
            style={{ "--glow": GLOW } as React.CSSProperties}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="absolute left-4 top-[17px] text-smoke" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          {results.length > 0 && (
            <ul className="absolute left-0 right-0 top-[58px] glass !bg-[rgb(26_24_22/0.92)] rounded-2xl p-1.5 flex flex-col shadow-[0_20px_50px_-10px_rgb(0_0_0/0.8)]">
              {results.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => add(a)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-paper/5 text-left">
                    <ArtistAvatar artist={a} size={40} />
                    <span className="flex-1 text-[15px]">{a.name}</span>
                    <span className="text-[13px] text-smoke pr-1">Add</span>
                  </button>
                  {/* Musicians often search for their own band first: let them claim it instead. */}
                  {draft.signupAs !== "band" && (
                  <button
                    type="button"
                    onClick={() => {
                      update({ band: { ...draft.band, name: a.name, since: draft.band?.since ?? new Date().getFullYear() } });
                      setQ("");
                    }}
                    className="ml-[52px] mb-1 -mt-1 text-[12.5px] text-smoke hover:text-paper underline-offset-2 hover:underline"
                  >
                    This is my band
                  </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {draft.band && draft.signupAs !== "band" && <OwnBand draft={draft} update={update} />}

        {picked.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-medium text-smoke">
              Your picks <span className="tabular-nums">· {picked.length}</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {picked.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => flip(a)}
                  aria-label={`Remove ${a.name}`}
                  className="rise-in h-10 pl-1 pr-3 rounded-full inline-flex items-center gap-2 text-[14px] border-[1.5px] transition active:scale-[0.97]"
                  style={{ borderColor: GLOW, background: `color-mix(in srgb, ${GLOW} 14%, var(--color-stage))` }}
                >
                  <ArtistAvatar artist={a} size={30} />
                  <span className="max-w-[140px] truncate">{a.name}</span>
                  <span aria-hidden="true" className="text-smoke text-[16px] leading-none">×</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {groups.map((g) => (
          <section key={g.from.id} className="rise-in flex flex-col gap-4">
            <h2 className="text-[13px] font-medium text-smoke">
              Because you picked <span className="text-paper">{g.from.name}</span>
            </h2>
            <div className="grid grid-cols-3 gap-x-2 gap-y-5">
              {g.artists.map((a, i) => (
                <ArtistTile key={a.id} artist={a} on={pickedIds.has(a.id)} onClick={() => flip(a)} delay={i * 35} />
              ))}
            </div>
          </section>
        ))}

        {!picked.length && !q && (
          <div className="rise-in rounded-[24px] border border-dashed border-paper/15 p-6 flex flex-col items-center text-center gap-3">
            <div className="flex -space-x-3" aria-hidden="true">
              {["#FFB245", "#FFACBA", "#C9B6FF"].map((c) => (
                <span key={c} className="size-12 rounded-full border-2 border-ink" style={{ background: `radial-gradient(circle at 35% 30%, ${c}, color-mix(in srgb, ${c} 30%, var(--color-ink)))` }} />
              ))}
            </div>
            <p className="text-[15px] text-pretty">Start with one artist who shaped your sound.</p>
            <p className="text-[13px] text-smoke text-pretty -mt-2">
              Anyone works, from The Beatles to your friend&apos;s band. Got your own music? Search your band name and tap &ldquo;This is my band&rdquo;.
            </p>
          </div>
        )}
      </div>
      <StepFooter>
        {picked.length < MIN && <p className="text-center text-[12px] text-smoke">Pick at least {MIN}</p>}
        {error && <p role="alert" className="text-center text-[13px] text-[#FF453A]">{error}</p>}
        <Button disabled={picked.length < MIN || saving} onClick={save}>
          {saving ? "Saving…" : `${fromProfile ? "Save" : "Continue"}${picked.length ? ` · ${picked.length} picked` : ""}`}
        </Button>
      </StepFooter>
    </main>
  );
}

/** Your own act, claimed from search: it becomes a project on your profile, not an influence. */
function OwnBand({ draft, update }: { draft: Draft; update: ReturnType<typeof useDraft>["update"] }) {
  const own = draft.band!;
  const now = new Date().getFullYear();
  return (
    <section className="rise-in rounded-[22px] p-4 flex flex-col gap-3 border-[1.5px] border-tungsten/60 bg-[color-mix(in_srgb,#FFB245_10%,var(--color-stage))]">
      <div className="flex items-start gap-3">
        <span className="size-10 rounded-[13px] bg-tungsten text-ink flex items-center justify-center shrink-0" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" /></svg>
        </span>
        <span className="flex-1 flex flex-col gap-0.5">
          <span className="text-[15px]">
            <span className="font-medium">{own.name}</span> goes on your profile
          </span>
          <span className="text-[13px] text-smoke text-pretty">As one of your projects, so people can hear your music. Add songs to it after signup.</span>
        </span>
        <button type="button" onClick={() => update({ band: undefined })} aria-label="Remove" className="text-smoke hover:text-paper text-[18px] leading-none px-1">
          ×
        </button>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-smoke pl-[52px]">
        Since
        <select
          value={own.since}
          onChange={(e) => update({ band: { ...own, since: Number(e.target.value) } })}
          className="h-8 rounded-full bg-ink border border-paper/15 px-3 text-paper text-[13px]"
        >
          {Array.from({ length: now - 1969 }, (_, i) => now - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function ArtistTile({ artist: a, on, onClick, delay }: { artist: Artist; on: boolean; onClick: () => void; delay: number }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="rise-in flex flex-col items-center gap-2 group" style={{ animationDelay: `${delay}ms` }}>
      <span className={`relative rounded-full p-[2px] transition ${on ? "" : "group-hover:scale-[1.03]"}`} style={{ background: on ? GLOW : "transparent" }}>
        <span className={`block rounded-full border-2 border-ink transition ${on ? "" : "opacity-85"}`}>
          <ArtistAvatar artist={a} size={84} />
        </span>
        {on && (
          <span className="absolute right-0 bottom-0 size-7 rounded-full text-ink border-2 border-ink flex items-center justify-center" style={{ background: GLOW }}>
            <CheckIcon size={13} />
          </span>
        )}
      </span>
      <span className={`text-[13px] text-center leading-tight ${on ? "text-paper font-medium" : "text-smoke"}`}>{a.name}</span>
    </button>
  );
}

/** Searches /api/artists (Deezer or Apple Music, with photos) 250 ms after typing stops; falls back to the offline catalog. */
function useArtistSearch(q: string) {
  const [found, setFound] = useState<{ q: string; artists: Artist[] }>({ q: "", artists: [] }); // keeps the last results on screen while the next search runs
  const term = q.trim();

  useEffect(() => {
    if (!term) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { artists: Artist[] };
        setFound({ q: term, artists: body.artists });
      } catch {
        if (!ctrl.signal.aborted) setFound({ q: term, artists: searchArtists(term) });
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  return term ? found.artists : [];
}
