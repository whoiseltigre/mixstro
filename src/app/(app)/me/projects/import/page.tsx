"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton, Button } from "@/components/ui";
import { Cover } from "@/components/player";
import { toast } from "@/components/toast";
import { useMyProjects } from "@/lib/projects-store";
import { TRACKS_MAX, thisYear, type Track } from "@/lib/projects";
import type { JourneyAct, JourneyArtist } from "@/lib/journey-types";
import { mbJourney, mbSearch, norm } from "@/lib/musicbrainz";

/**
 * "We found your journey": type the name you release under, confirm it's you, and your
 * releases land on a timeline by year with the bands you were in suggested as projects.
 * One tap adds them all to your Projects.
 */
type Load = { acts: JourneyAct[]; done: boolean };

export default function ImportJourney() {
  const router = useRouter();
  const { projects, ready, save } = useMyProjects();
  const [name, setName] = useState("");
  const [found, setFound] = useState<{ q: string; artists: JourneyArtist[] }>({ q: "", artists: [] });
  const [skipped, setSkipped] = useState<string[]>([]);
  const [looking, setLooking] = useState(false);
  const [chosen, setChosen] = useState<JourneyArtist>();
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const started = useRef(new Set<string>());
  const appleByName = useRef(new Map<string, JourneyArtist>());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const seen = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const term = name.trim();

  useEffect(() => {
    if (term.length < 2 || chosen) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLooking(true);
      // Apple answers fast, MusicBrainz can take a while: show Apple's match first, then merge.
      const applePromise = fetch(`/api/music/journey?name=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<{ apple?: JourneyArtist; image?: string }>)
        .catch(() => ({}) as { apple?: JourneyArtist; image?: string });
      const mbPromise = mbSearch(term);
      const apple = await applePromise;
      if (ctrl.signal.aborted) return;
      if (apple.apple) {
        appleByName.current.set(norm(apple.apple.name), apple.apple);
        setFound({ q: term, artists: [apple.apple] });
      }
      const mbArtists = await mbPromise;
      if (ctrl.signal.aborted) return;
      // Exact-name matches get the photo; self-released musicians only Apple knows come last.
      const artists = mbArtists.map((a) => (norm(a.name) === norm(term) ? { ...a, image: apple.image } : a));
      if (apple.apple && !artists.some((a) => norm(a.name) === norm(apple.apple!.name))) artists.push(apple.apple);
      setFound({ q: term, artists });
      if (!ctrl.signal.aborted) setLooking(false);
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, chosen]);

  const upsert = useCallback((id: string, act: JourneyAct) => {
    setLoads((all) => {
      const cur = all[id] ?? { acts: [], done: false };
      const same = cur.acts.find((x) => x.name === act.name || (x.relation === "self" && act.relation === "self"));
      // Your own act can arrive twice: releases from Apple, years from MusicBrainz. Keep the best of both.
      const merged = same
        ? { ...same, ...act, name: same.name, startYear: act.startYear ?? same.startYear, endYear: act.endYear ?? same.endYear, releases: act.releases.length ? act.releases : same.releases }
        : act;
      const acts = [...cur.acts.filter((x) => x !== same), merged].sort((a, b) => (a.relation === "self" ? -1 : b.relation === "self" ? 1 : (b.startYear ?? 0) - (a.startYear ?? 0)));
      return { ...all, [id]: { ...cur, acts } };
    });
  }, []);

  /**
   * Starts loading someone's journey, at most once per artist. Called as soon as the
   * "Is this you?" card shows, so most of it is done by the time they tap Yes. Their own
   * releases come from Apple in about a second; bands and older releases follow from MusicBrainz.
   */
  const prefetch = useCallback(
    (a: JourneyArtist) => {
      if (started.current.has(a.id)) return;
      started.current.add(a.id);
      const enrich = async (act: JourneyAct) => {
        if (!act.releases.length) return act;
        try {
          const res = await fetch("/api/music/journey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acts: [act] }) });
          return ((await res.json()) as { acts?: JourneyAct[] }).acts?.[0] ?? act;
        } catch {
          return act;
        }
      };
      const peer = a.id.startsWith("apple:") ? a : appleByName.current.get(norm(a.name));
      const tasks: Promise<unknown>[] = [];
      if (peer) {
        tasks.push(
          fetch(`/api/music/journey?id=${encodeURIComponent(peer.id)}`)
            .then((r) => r.json() as Promise<{ acts?: JourneyAct[] }>)
            .then((body) => body.acts?.[0] && upsert(a.id, { ...body.acts[0], name: a.name }))
            .catch(() => {}),
        );
      }
      if (a.id.startsWith("mb:")) {
        const enriching: Promise<unknown>[] = [];
        tasks.push(
          mbJourney(a.id.slice(3), { skipOwn: Boolean(peer), onAct: (act) => enriching.push(enrich(act).then((e) => upsert(a.id, e))) })
            .catch(() => null)
            .then(() => Promise.all(enriching)),
        );
      }
      Promise.allSettled(tasks).then(() => setLoads((all) => ({ ...all, [a.id]: { acts: all[a.id]?.acts ?? [], done: true } })));
    },
    [upsert],
  );

  const confirm = (a: JourneyArtist) => {
    setChosen(a);
    prefetch(a);
  };

  const load = chosen ? loads[chosen.id] : undefined;
  // Keep what can play on a profile; bands with known years stay too (they're part of the story).
  const acts = useMemo(() => (load?.acts ?? []).filter((x) => x.releases.some((r) => r.url) || (x.relation === "band" && x.startYear)), [load]);
  const loading = Boolean(chosen && !load?.done);

  // Each act starts ticked, with its newest playable releases up to a project's limit.
  useEffect(() => {
    const fresh = acts.filter((act) => !seen.current.has(`${act.name}:${act.releases.length}`));
    if (!fresh.length) return;
    setPicked((s) => {
      const next = new Set(s);
      for (const act of fresh) {
        if (!seen.current.has(`act:${act.name}`)) next.add(`act:${act.name}`);
        seen.current.add(`act:${act.name}`);
        seen.current.add(`${act.name}:${act.releases.length}`);
        act.releases.filter((r) => r.url).slice(0, TRACKS_MAX).forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [acts]);

  const toggle = (key: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const chosenCount = useMemo(
    () => (acts ?? []).reduce((n, a) => n + (picked.has(`act:${a.name}`) ? Math.max(1, Math.min(TRACKS_MAX, a.releases.filter((r) => r.url && picked.has(r.id)).length)) : 0), 0),
    [acts, picked],
  );

  async function addAll() {
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
  // Get a head start while they look at the card.
  useEffect(() => {
    if (candidate && !chosen) prefetch(candidate);
  }, [candidate, chosen, prefetch]);
  const exhausted = found.q === term && term.length > 1 && !looking && !candidate;

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-40 md:pb-16 flex flex-col gap-6 md:max-w-[560px] md:mx-auto">
      <div className="mt-2 flex flex-col gap-5">
        <BackButton href="/me/projects" />
        <div className="flex flex-col gap-2">
          <h1 className="text-display font-bold tracking-[-0.03em] leading-tight">{acts.length ? "We found your journey" : "Find your releases"}</h1>
          <p className="text-callout text-smoke leading-snug">
            {acts.length
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
            className="field-search h-[52px] px-5 text-body"
          />
          {candidate ? (
            <div key={candidate.id} className="rise-in glass !bg-[rgb(26_24_22/0.7)] rounded-panel p-4 flex flex-col gap-3.5 relative overflow-hidden">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-30" style={{ background: "radial-gradient(70% 100% at 50% 0%, #FFB245, transparent)" }} />
              <div className="relative flex items-center gap-3">
                <Cover src={candidate.image} size={56} round />
                <span className="flex-1 flex flex-col min-w-0">
                  <span className="text-caption font-semibold uppercase tracking-[0.12em] text-gel-pink">Is this you?</span>
                  <span className="text-title4 font-medium leading-tight truncate">{candidate.name}</span>
                  <span className="text-footnote text-smoke truncate">
                    {[candidate.kind === "group" ? "Band" : "Artist", candidate.hint, candidate.since && `since ${candidate.since}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </div>
              <div className="relative grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSkipped((s) => [...s, candidate.id])} className="h-11 rounded-full border border-paper/20 text-callout hover:border-paper/40 transition">
                  Not me
                </button>
                <button type="button" onClick={() => confirm(candidate)} className="press h-11 rounded-full bg-paper text-ink text-callout font-semibold">
                  {candidate.kind === "group" ? "I play in it" : "Yes, that's me"}
                </button>
              </div>
            </div>
          ) : looking ? (
            <p className="text-footnote text-smoke px-1">Looking for {term}…</p>
          ) : exhausted ? (
            <p className="text-footnote text-smoke px-1">We couldn&apos;t find that name in the music catalogs. You can still add a project yourself and paste links.</p>
          ) : null}
        </div>
      )}

      {chosen && loading && !acts.length && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span aria-hidden="true" className="size-10 rounded-full border-2 border-paper/20 border-t-tungsten animate-spin" />
          <p className="text-callout">Looking through {chosen.name}&apos;s releases…</p>
        </div>
      )}

      {chosen && !loading && !acts.length && (
        <div className="flex flex-col gap-3">
          <p className="text-callout text-smoke">We couldn&apos;t find releases for {chosen.name}. Add a project yourself and paste a link or two.</p>
          <Button variant="glass" onClick={() => setChosen(undefined)} className="h-12">Try another name</Button>
        </div>
      )}

      {acts.length > 0 && (
        <div className="flex flex-col gap-7">
          {acts.map((act) => (
            <div key={act.name} className="rise-in">
              <ActBlock act={act} picked={picked} toggle={toggle} />
            </div>
          ))}
          {loading && chosen?.id.startsWith("mb:") && (
            <div className="flex items-center gap-3 p-3.5 rounded-tile border border-dashed border-paper/16 text-subhead text-smoke">
              <span aria-hidden="true" className="size-5 rounded-full border-2 border-paper/20 border-t-tungsten animate-spin shrink-0" />
              Finding the bands you were in and older releases…
            </div>
          )}
        </div>
      )}

      {acts.length > 0 && (
        <div className="fixed z-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[408px] bottom-[calc(max(env(safe-area-inset-bottom),16px)+74px)] md:bottom-6">
          <button
            type="button"
            onClick={addAll}
            disabled={busy || !ready || chosenCount === 0}
            className="press w-full h-[53px] rounded-full bg-paper text-ink text-body font-semibold shadow-float disabled:opacity-50"
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
  // Only releases that can play here; live tapes and bootlegs without a link are just counted.
  const playable = act.releases.filter((r) => r.url);
  const others = act.releases.length - playable.length;
  const byYear = useMemo(() => {
    const groups = new Map<string, typeof act.releases>();
    for (const r of act.releases.filter((x) => x.url)) {
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
        className={`flex items-center gap-3 p-3.5 rounded-tile text-left border transition ${act.relation === "band" ? "bg-gel-pink/8 border-gel-pink/25" : "bg-stage border-paper/10"}`}
      >
        <span className="flex-1 min-w-0 flex flex-col">
          {act.relation === "band" && <span className="text-caption font-semibold text-gel-pink">Band found</span>}
          <span className="text-body-lg font-semibold truncate">{act.name}</span>
          <span className="text-footnote text-smoke truncate">{[act.role, years, playable.length ? `${playable.length} on Apple Music` : undefined].filter(Boolean).join(" · ")}</span>
        </span>
        <Check on={on} />
      </button>

      {on && playable.length > 0 && (
        <div className="relative pl-5 flex flex-col">
          <span aria-hidden="true" className="absolute left-[5px] top-2 bottom-2 w-[1.5px] bg-gradient-to-b from-gel-pink to-gel-pink/10" />
          {byYear.map(([year, list]) => (
            <div key={year} className="flex flex-col">
              <span className="relative text-caption font-bold tracking-[0.04em] text-smoke mt-2 mb-1">
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
                    <span className={`text-callout font-medium truncate ${r.url ? "" : "text-paper/60"}`}>{r.title}</span>
                    <span className="text-caption text-smoke truncate">{r.url ? `${r.type} · Apple Music` : `${r.type} · no streaming link found`}</span>
                  </span>
                  {r.url && <Check on={picked.has(r.id)} />}
                </button>
              ))}
            </div>
          ))}
          {others > 0 && <p className="text-caption text-smoke pt-2">Plus {others} more without a streaming link, like live tapes. You can paste links for those yourself.</p>}
          {act.releases.filter((r) => r.url && picked.has(r.id)).length > TRACKS_MAX && (
            <p className="text-caption text-smoke pt-2">A project shows up to {TRACKS_MAX} releases. We&apos;ll add the first {TRACKS_MAX} you ticked.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`size-[24px] rounded-full flex items-center justify-center shrink-0 transition ${on ? "bg-paper text-ink" : "border-[1.5px] border-paper/30"}`}>
      {on && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3" /></svg>
      )}
    </span>
  );
}
