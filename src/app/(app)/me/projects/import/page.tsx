"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton, Button } from "@/components/ui";
import { Cover } from "@/components/player";
import { toast } from "@/components/toast";
import { useMyProjects } from "@/lib/projects-store";
import { TRACKS_MAX, thisYear, type Track } from "@/lib/projects";
import type { JourneyAct, JourneyArtist } from "@/lib/journey";

/**
 * "We found your journey": type the name you release under, confirm it's you, and your
 * releases land on a timeline by year with the bands you were in suggested as projects.
 * One tap adds them all to your Projects.
 */
export default function ImportJourney() {
  const router = useRouter();
  const { projects, ready, save } = useMyProjects();
  const [name, setName] = useState("");
  const [found, setFound] = useState<{ q: string; artists: JourneyArtist[] }>({ q: "", artists: [] });
  const [skipped, setSkipped] = useState<string[]>([]);
  const [looking, setLooking] = useState(false);
  const [chosen, setChosen] = useState<JourneyArtist>();
  const [acts, setActs] = useState<JourneyAct[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const term = name.trim();

  useEffect(() => {
    if (term.length < 2 || chosen) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLooking(true);
      try {
        const res = await fetch(`/api/music/journey?name=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const body = (await res.json()) as { artists?: JourneyArtist[] };
        setFound({ q: term, artists: body.artists ?? [] });
      } catch {}
      if (!ctrl.signal.aborted) setLooking(false);
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, chosen]);

  async function confirm(a: JourneyArtist) {
    setChosen(a);
    setActs(null);
    try {
      const res = await fetch(`/api/music/journey?id=${encodeURIComponent(a.id)}`);
      const body = (await res.json()) as { acts?: JourneyAct[] };
      const list = (body.acts ?? []).filter((x) => x.releases.length || x.relation === "band");
      setActs(list);
      // Start with every act and the newest playable releases ticked, up to a project's limit.
      const on = new Set<string>();
      for (const act of list) {
        on.add(`act:${act.name}`);
        act.releases.filter((r) => r.url).slice(0, TRACKS_MAX).forEach((r) => on.add(r.id));
      }
      setPicked(on);
    } catch {
      setActs([]);
    }
  }

  const toggle = (key: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const chosenCount = useMemo(() => (acts ?? []).reduce((n, a) => n + (picked.has(`act:${a.name}`) ? Math.max(1, a.releases.filter((r) => r.url && picked.has(r.id)).length) : 0), 0), [acts, picked]);

  async function addAll() {
    if (!acts) return;
    setBusy(true);
    let added = 0;
    for (const act of acts) {
      if (!picked.has(`act:${act.name}`)) continue;
      const fresh: Track[] = act.releases
        .filter((r) => r.url && picked.has(r.id))
        .map((r) => ({ id: crypto.randomUUID(), provider: "apple_music", url: r.url, title: r.title, thumb: r.artwork }));
      const existing = projects.find((p) => p.name.trim().toLowerCase() === act.name.toLowerCase());
      const years = act.releases.map((r) => r.year).filter((y): y is number => Boolean(y));
      const start = act.startYear ?? (years.length ? Math.min(...years) : thisYear());
      if (existing) {
        const known = new Set(existing.tracks.map((t) => t.url));
        const tracks = [...existing.tracks, ...fresh.filter((t) => !known.has(t.url))].slice(0, TRACKS_MAX);
        const res = await save({ name: existing.name, role: existing.role, startYear: Math.min(existing.startYear, act.startYear ?? existing.startYear), endYear: existing.endYear, tracks }, existing.id);
        if (!res.error) added++;
      } else {
        const startYear = start;
        const endYear = act.endYear && act.endYear >= startYear ? act.endYear : undefined;
        const res = await save({ name: act.name, role: act.role, startYear, endYear, tracks: fresh.slice(0, TRACKS_MAX) });
        if (!res.error) added++;
      }
    }
    setBusy(false);
    if (added) {
      toast(`Added ${added} ${added === 1 ? "project" : "projects"} to your journey`);
      router.push("/me");
    } else toast("Couldn't add those. Try again.");
  }

  const candidate = found.q === term ? found.artists.find((a) => !skipped.includes(a.id)) : undefined;
  const exhausted = found.q === term && term.length > 1 && !looking && !candidate;

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-40 md:pb-16 flex flex-col gap-6 md:max-w-[560px] md:mx-auto">
      <div className="mt-2 flex flex-col gap-5">
        <BackButton href="/me/projects" />
        <div className="flex flex-col gap-2">
          <h1 className="text-[34px] font-bold tracking-[-0.03em] leading-tight">{acts?.length ? "We found your journey" : "Find your releases"}</h1>
          <p className="text-[15px] text-smoke leading-snug">
            {acts?.length
              ? "Your releases by year, and the bands you were in. Untick anything that isn't yours."
              : "Type the name you release under, or a band you were in. We'll lay out your releases by year."}
          </p>
        </div>
      </div>

      {!chosen && (
        <div className="flex flex-col gap-3">
          <label htmlFor="journey-name" className="sr-only">Artist or band name</label>
          <input
            id="journey-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Your artist or band name"
            className="h-[56px] px-5 rounded-full bg-stage border border-paper/12 text-[16px] placeholder:text-smoke/50 outline-none focus:border-paper/50 transition"
          />
          {candidate ? (
            <div key={candidate.id} className="rise-in glass !bg-[rgb(26_24_22/0.7)] rounded-[24px] p-4 flex flex-col gap-3.5 relative overflow-hidden">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-30" style={{ background: "radial-gradient(70% 100% at 50% 0%, #FFB245, transparent)" }} />
              <div className="relative flex items-center gap-3">
                <Cover src={candidate.image} size={56} round />
                <span className="flex-1 flex flex-col min-w-0">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-tungsten">Is this you?</span>
                  <span className="text-[18px] font-medium leading-tight truncate">{candidate.name}</span>
                  <span className="text-[12.5px] text-smoke truncate">
                    {[candidate.kind === "group" ? "Band" : "Artist", candidate.hint, candidate.since && `since ${candidate.since}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </div>
              <div className="relative grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSkipped((s) => [...s, candidate.id])} className="h-11 rounded-full border border-paper/20 text-[15px] hover:border-paper/40 transition">
                  Not me
                </button>
                <button type="button" onClick={() => confirm(candidate)} className="h-11 rounded-full bg-tungsten text-ink text-[15px] font-semibold active:scale-[0.98] transition">
                  {candidate.kind === "group" ? "I play in it" : "Yes, that's me"}
                </button>
              </div>
            </div>
          ) : looking ? (
            <p className="text-[13px] text-smoke px-1">Looking for {term}…</p>
          ) : exhausted ? (
            <p className="text-[13px] text-smoke px-1">We couldn&apos;t find that name in the music catalogs. You can still add a project yourself and paste links.</p>
          ) : null}
        </div>
      )}

      {chosen && acts === null && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span aria-hidden="true" className="size-10 rounded-full border-2 border-paper/20 border-t-tungsten animate-spin" />
          <p className="text-[15px]">Looking through {chosen.name}&apos;s releases…</p>
          <p className="text-[13px] text-smoke">This can take up to half a minute for a long career.</p>
        </div>
      )}

      {chosen && acts?.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-smoke">We couldn&apos;t find releases for {chosen.name}. Add a project yourself and paste a link or two.</p>
          <Button variant="glass" onClick={() => { setChosen(undefined); setActs(null); }} className="h-12">Try another name</Button>
        </div>
      )}

      {acts && acts.length > 0 && (
        <div className="flex flex-col gap-7">
          {acts.map((act) => (
            <ActBlock key={act.name} act={act} picked={picked} toggle={toggle} />
          ))}
        </div>
      )}

      {acts && acts.length > 0 && (
        <div className="fixed z-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[408px] bottom-[calc(max(env(safe-area-inset-bottom),16px)+74px)] md:bottom-6">
          <button
            type="button"
            onClick={addAll}
            disabled={busy || !ready || chosenCount === 0}
            className="w-full h-[53px] rounded-full bg-tungsten text-ink text-[16px] font-semibold shadow-[0_12px_40px_rgb(0_0_0/0.5)] active:scale-[0.99] transition disabled:opacity-50"
          >
            {busy ? "Adding…" : `Add ${chosenCount} to my journey`}
          </button>
        </div>
      )}
    </main>
  );
}

function ActBlock({ act, picked, toggle }: { act: JourneyAct; picked: Set<string>; toggle: (key: string) => void }) {
  const on = picked.has(`act:${act.name}`);
  const years = act.startYear ? `${act.startYear} to ${act.endYear ?? "now"}` : undefined;
  const byYear = useMemo(() => {
    const groups = new Map<string, typeof act.releases>();
    for (const r of act.releases) {
      const k = r.year ? String(r.year) : "Undated";
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    return [...groups.entries()];
  }, [act]);

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => toggle(`act:${act.name}`)}
        className={`flex items-center gap-3 p-3.5 rounded-[18px] text-left border transition ${act.relation === "band" ? "bg-[#FFACBA]/8 border-[#FFACBA]/25" : "bg-stage border-paper/10"}`}
      >
        <span className="flex-1 min-w-0 flex flex-col">
          {act.relation === "band" && <span className="text-[12px] font-semibold text-[#FFACBA]">Band found</span>}
          <span className="text-[17px] font-semibold truncate">{act.name}</span>
          <span className="text-[13px] text-smoke truncate">{[act.role, years, `${act.releases.length} ${act.releases.length === 1 ? "release" : "releases"}`].filter(Boolean).join(" · ")}</span>
        </span>
        <Check on={on} />
      </button>

      {on && act.releases.length > 0 && (
        <div className="relative pl-5 flex flex-col">
          <span aria-hidden="true" className="absolute left-[5px] top-2 bottom-2 w-[1.5px] bg-gradient-to-b from-tungsten to-tungsten/10" />
          {byYear.map(([year, list]) => (
            <div key={year} className="flex flex-col">
              <span className="relative text-[12px] font-bold tracking-[0.04em] text-smoke mt-2 mb-1">
                <span aria-hidden="true" className="absolute -left-[19px] top-[3px] size-2 rounded-full bg-tungsten" />
                {year}
              </span>
              {list.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="checkbox"
                  aria-checked={picked.has(r.id)}
                  disabled={!r.url}
                  onClick={() => toggle(r.id)}
                  className="flex items-center gap-3 py-1.5 text-left disabled:cursor-default"
                >
                  <Cover src={r.artwork} size={44} />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className={`text-[15px] font-medium truncate ${r.url ? "" : "text-paper/60"}`}>{r.title}</span>
                    <span className="text-[12px] text-smoke truncate">{r.url ? `${r.type} · Apple Music` : `${r.type} · no streaming link found`}</span>
                  </span>
                  {r.url && <Check on={picked.has(r.id)} />}
                </button>
              ))}
            </div>
          ))}
          {act.releases.filter((r) => r.url && picked.has(r.id)).length > TRACKS_MAX && (
            <p className="text-[12px] text-smoke pt-2">A project shows up to {TRACKS_MAX} releases. We&apos;ll add the first {TRACKS_MAX} you ticked.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`size-[24px] rounded-full flex items-center justify-center shrink-0 transition ${on ? "bg-tungsten text-ink" : "border-[1.5px] border-paper/30"}`}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3" /></svg>
      )}
    </span>
  );
}
