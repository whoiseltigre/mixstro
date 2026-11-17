"use client";

import { PersonPhoto } from "@/components/person-photo";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/ui";
import type { Musician } from "@/lib/mock";
import type { BandCard } from "@/lib/band-hub";
import { FadeImg } from "@/components/fade-image";
import { familyOf, nounFor } from "@/lib/instruments";
import { nameWash } from "@/lib/projects";

const WITHIN = [5, 10, 25, 50];
const LOOKING = [
  { id: "band", label: "Bands and members", goals: ["start_project", "join_band"], hint: /band|member|bassist|drummer|singer|guitarist/i },
  { id: "jam", label: "Jams and co-writing", goals: ["jam"], hint: /jam|co-?writ/i },
  { id: "paid", label: "Paid and session work", goals: ["paid_work"], hint: /paid|session|gig/i },
];

const instrumentsOf = (m: Musician) => m.instruments?.length ? m.instruments : [m.instrument];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const genresOf = (m: Musician) => (m.genreList?.length ? m.genreList : m.genres.split(", ")).map(cap);

type Filters = { plays: string[]; genres: string[]; within: number | null; looking: string | null };
const NONE: Filters = { plays: [], genres: [], within: null, looking: null };
const STORE = "mixstro:search-filters";

/** Search by name, instrument, genre, neighborhood or influence, narrowed by filters. */
export function SearchList({ people, bands = [], plays = [], initialTab = "people" }: { people: Musician[]; bands?: BandCard[]; plays?: string[]; initialTab?: "people" | "bands" }) {
  const [tab, setTab] = useState<"people" | "bands">(initialTab);
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filters>(NONE);
  const [open, setOpen] = useState(false);

  // Remember filters on this device, so search opens the way you left it.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null");
      if (saved) setF({ ...NONE, ...saved });
    } catch {}
  }, []);
  const set = (next: Filters) => {
    setF(next);
    try {
      sessionStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
  };

  // Only offer choices someone here actually has, most common first.
  const options = useMemo(() => ({ plays: ranked(people.flatMap(instrumentsOf)), genres: ranked(people.flatMap(genresOf)) }), [people]);
  const hasDistances = people.some((m) => m.distanceMi !== undefined);

  const s = q.trim().toLowerCase();
  const results = people.filter((m) => {
    if (s && ![m.name, m.instrument, m.genres, m.neighborhood, ...m.influences.map((a) => a.name)].some((v) => v.toLowerCase().includes(s))) return false;
    if (f.plays.length && !instrumentsOf(m).some((i) => f.plays.includes(i))) return false;
    if (f.genres.length && !genresOf(m).some((g) => f.genres.includes(g))) return false;
    if (f.within !== null && (m.distanceMi === undefined || m.distanceMi > f.within)) return false;
    if (f.looking) {
      const l = LOOKING.find((x) => x.id === f.looking)!;
      if (!(m.goals?.length ? m.goals.some((g) => l.goals.includes(g)) : l.hint.test(m.lookingFor))) return false;
    }
    return true;
  });
  if (f.within !== null) results.sort((a, b) => (a.distanceMi ?? 1e9) - (b.distanceMi ?? 1e9));

  const active = f.plays.length + f.genres.length + (f.within !== null ? 1 : 0) + (f.looking ? 1 : 0);
  const toggle = (key: "plays" | "genres", v: string) => set({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] });

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-16 flex flex-col gap-4 md:max-w-[680px] md:mx-auto">
      <div className="mt-2 flex items-center gap-2.5">
        <BackButton href="/discover" />
        <label htmlFor="q" className="sr-only">Search musicians</label>
        <input
          id="q"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "bands" ? "Band, genre or city" : "Name, instrument or influence"}
          className="flex-1 min-w-0 h-11 rounded-full bg-stage border border-paper/12 px-4 text-[16px] placeholder:text-smoke outline-none focus:border-paper/40"
        />
        {tab === "people" && <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="filters"
          className={`h-11 shrink-0 rounded-full border px-4 text-[14px] font-semibold flex items-center gap-2 transition ${active ? "bg-paper text-ink border-paper" : "bg-stage border-paper/12 hover:border-paper/40"}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filters{active ? ` · ${active}` : ""}
        </button>}
      </div>

      <div role="tablist" aria-label="Search for" className="flex p-[3px] rounded-[12px] bg-stage">
        {(["people", "bands"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              history.replaceState(null, "", t === "bands" ? "?tab=bands" : location.pathname);
            }}
            className={`flex-1 h-9 rounded-[10px] text-[14px] font-semibold transition ${tab === t ? "bg-riser text-paper shadow-[0_1px_4px_rgb(0_0_0/0.3)]" : "text-smoke"}`}
          >
            {t === "people" ? "Musicians" : "Bands"}
          </button>
        ))}
      </div>

      {tab === "bands" && <BandResults bands={bands} plays={plays} q={s} />}

      {tab === "people" && open && (
        <div id="filters" className="flex flex-col gap-4 p-4 rounded-[22px] bg-stage border border-paper/10">
          <Group label="Plays">
            {options.plays.map((v) => <Chip key={v} on={f.plays.includes(v)} onClick={() => toggle("plays", v)}>{v}</Chip>)}
          </Group>
          <Group label="Genre">
            {options.genres.map((v) => <Chip key={v} on={f.genres.includes(v)} onClick={() => toggle("genres", v)}>{v}</Chip>)}
          </Group>
          {hasDistances && (
            <Group label="Within">
              {WITHIN.map((v) => <Chip key={v} on={f.within === v} onClick={() => set({ ...f, within: f.within === v ? null : v })}>{v} mi</Chip>)}
            </Group>
          )}
          <Group label="Looking for">
            {LOOKING.map((l) => <Chip key={l.id} on={f.looking === l.id} onClick={() => set({ ...f, looking: f.looking === l.id ? null : l.id })}>{l.label}</Chip>)}
          </Group>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[13px] text-smoke">{results.length === 1 ? "1 musician" : `${results.length} musicians`}</span>
            {active > 0 && <button type="button" onClick={() => set(NONE)} className="text-[14px] font-semibold underline underline-offset-4">Clear all</button>}
          </div>
        </div>
      )}

      {tab === "people" && <ul className="flex flex-col">
        {results.map((m) => (
          <li key={m.username}>
            <Link href={`/m/${m.username}`} className="flex items-center gap-3.5 py-3 border-b border-paper/8">
              <div className="relative size-14 rounded-full overflow-hidden shrink-0">
                <PersonPhoto person={m} sizes="56px" initialsSize={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[16px] font-semibold">{m.name}</span>
                <span className="text-[13px] text-smoke truncate">
                  {m.instrument} · {m.genres} · {m.neighborhood}{m.distanceMi !== undefined ? ` · ${m.distanceMi} mi` : ""}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {results.length === 0 && (
          <li className="py-10 text-center text-smoke flex flex-col items-center gap-3">
            {s || active ? (
              <>
                <span>{s ? <>No musicians match &ldquo;{q}&rdquo;{active ? " with these filters" : ""} yet.</> : "No one matches these filters yet."}</span>
                {active > 0 && <button type="button" onClick={() => set(NONE)} className="text-paper font-semibold underline underline-offset-4">Clear filters</button>}
              </>
            ) : (
              "No one else is here yet. Musicians show up as they join."
            )}
          </li>
        )}
      </ul>}
    </main>
  );
}

/** Does this open role fit something you play? "Drums" fits "Drum kit"; "Lead guitar" fits "Electric guitar". */
function fits(role: string, plays: string[]) {
  const r = role.toLowerCase();
  return plays.some((p) => {
    const fam = familyOf(p)?.id;
    return role === p || (fam && (role === fam || familyOf(role)?.id === fam || r.includes(fam.toLowerCase()))) || r.includes(p.toLowerCase());
  });
}

/** Bands: open spots that fit what you play first, then everyone nearby. */
function BandResults({ bands, plays, q }: { bands: BandCard[]; plays: string[]; q: string }) {
  const match = (b: BandCard) => !q || [b.name, b.city ?? "", ...b.genres, ...b.openRoles].some((v) => v.toLowerCase().includes(q));
  const list = bands.filter(match);
  const forYou = list.filter((b) => b.openRoles.length && (plays.length ? b.openRoles.some((r) => fits(r, plays)) : true));
  const near = [...list].sort((a, b) => (a.miles ?? 1e9) - (b.miles ?? 1e9) || a.name.localeCompare(b.name));
  const main = plays[0];
  const fam = main ? familyOf(main)?.id ?? main : null;
  const noun = fam ? nounFor(fam) : null;

  return (
    <div className="flex flex-col gap-6 pt-1">
      {forYou.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">{noun ? `Bands looking for ${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}` : "Bands with an open spot"}</h2>
            {noun && <span className="text-[13px] text-smoke">Because you play {main!.toLowerCase()}</span>}
          </div>
          <ul className="hscroll flex gap-3 -mx-5 px-5 md:mx-0 md:px-0">
            {forYou.map((b) => (
              <li key={b.id} className="shrink-0 w-[168px]">
                <Link href={`/b/${b.id}`} className="flex flex-col gap-2 group">
                  <span className="relative block h-[124px] rounded-[20px] overflow-hidden" style={{ background: nameWash(b.name) }}>
                    {b.photo && <FadeImg src={b.photo} alt="" className="absolute inset-0 size-full object-cover transition group-hover:scale-[1.03]" />}
                    <span className="absolute left-2 bottom-2 h-6 px-2.5 rounded-full bg-tungsten text-ink text-[12px] font-semibold flex items-center max-w-[150px] truncate">
                      {(plays.length ? b.openRoles.find((r) => fits(r, plays)) : b.openRoles[0]) ?? b.openRoles[0]}
                    </span>
                  </span>
                  <span className="flex flex-col px-0.5">
                    <span className="text-[15px] font-semibold truncate">{b.name}</span>
                    <span className="text-[12px] text-smoke truncate">{[b.genres[0], b.miles !== undefined ? `${b.miles} mi` : b.city?.split(",")[0]].filter(Boolean).join(" · ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">{near.some((b) => b.miles !== undefined) ? "Bands near you" : "Bands on Mixstro"}</h2>
        {near.length ? (
          <ul className="flex flex-col rounded-[22px] bg-stage divide-y divide-paper/8">
            {near.map((b) => (
              <li key={b.id}>
                <Link href={`/b/${b.id}`} className="flex items-center gap-3.5 px-3.5 py-3 transition hover:bg-paper/4">
                  <span className="relative size-14 rounded-[16px] overflow-hidden shrink-0" style={{ background: nameWash(b.name) }}>
                    {b.photo && <FadeImg src={b.photo} alt="" className="absolute inset-0 size-full object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[16px] font-semibold truncate">{b.name}</span>
                    <span className="text-[13px] text-smoke truncate">
                      {[b.genres[0], b.city?.split(",")[0], b.miles !== undefined ? `${b.miles} mi` : null, `${b.members} ${b.members === 1 ? "member" : "members"}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {b.openRoles.length > 0 && <span className="h-6 px-2.5 rounded-full bg-tungsten/16 text-tungsten text-[12px] font-semibold flex items-center shrink-0">Open spot</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-smoke">{q ? "No bands match that yet." : "No bands here yet. Add yours from your profile."}</p>
        )}
      </section>
    </div>
  );
}

function ranked(values: string[]) {
  const n = new Map<string, number>();
  for (const v of values) if (v) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[12px] font-semibold uppercase tracking-[0.08em] text-smoke mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-9 rounded-full px-3.5 text-[14px] border transition ${on ? "bg-tungsten text-ink border-tungsten font-semibold" : "border-paper/15 hover:border-paper/40"}`}
    >
      {children}
    </button>
  );
}
