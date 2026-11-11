"use client";

import { PersonPhoto } from "@/components/person-photo";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/ui";
import type { Musician } from "@/lib/mock";

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
export function SearchList({ people }: { people: Musician[] }) {
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
          placeholder="Name, instrument or influence"
          className="flex-1 min-w-0 h-11 rounded-full bg-stage border border-paper/12 px-4 text-[16px] placeholder:text-smoke outline-none focus:border-paper/40"
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="filters"
          className={`h-11 shrink-0 rounded-full border px-4 text-[14px] font-semibold flex items-center gap-2 transition ${active ? "bg-paper text-ink border-paper" : "bg-stage border-paper/12 hover:border-paper/40"}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filters{active ? ` · ${active}` : ""}
        </button>
      </div>

      {open && (
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

      <ul className="flex flex-col">
        {results.map((m) => (
          <li key={m.username}>
            <Link href={`/m/${m.username}`} className="flex items-center gap-3.5 py-3 border-b border-paper/8">
              <div className="relative size-14 rounded-full overflow-hidden shrink-0">
                <PersonPhoto person={m} sizes="56px" initialsSize={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[16px] font-semibold">
                  {m.name}
                  {m.sample && <SampleTag />}
                </span>
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
      </ul>
    </main>
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

/** Sample people fill the app while it's small; the tag keeps anyone from waiting on a reply. */
function SampleTag() {
  return <span className="ml-2 align-middle inline-flex h-5 px-2 rounded-full bg-paper/10 text-[11px] font-semibold text-smoke">Sample</span>;
}
