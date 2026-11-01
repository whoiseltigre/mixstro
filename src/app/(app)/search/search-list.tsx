"use client";

import { PersonPhoto } from "@/components/person-photo";
import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/ui";
import type { Musician } from "@/lib/mock";

/** Search by name, instrument, genre, neighborhood or influence. */
export function SearchList({ people }: { people: Musician[] }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const results = s
    ? people.filter((m) =>
        [m.name, m.instrument, m.genres, m.neighborhood, ...m.influences.map((a) => a.name)].some((v) => v.toLowerCase().includes(s)),
      )
    : people;

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-16 flex flex-col gap-5 md:max-w-[680px] md:mx-auto">
      <div className="mt-2 flex items-center gap-2.5">
        <BackButton href="/discover" />
        <label htmlFor="q" className="sr-only">Search musicians</label>
        <input
          id="q"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, instrument or influence"
          className="flex-1 h-11 rounded-full bg-stage border border-paper/12 px-4 text-[16px] placeholder:text-smoke outline-none focus:border-paper/40"
        />
      </div>
      <ul className="flex flex-col">
        {results.map((m) => (
          <li key={m.username}>
            <Link href={`/m/${m.username}`} className="flex items-center gap-3.5 py-3 border-b border-paper/8">
              <div className="relative size-14 rounded-full overflow-hidden shrink-0">
                <PersonPhoto person={m} sizes="56px" initialsSize={20} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[16px] font-semibold">{m.name}</span>
                <span className="text-[13px] text-smoke truncate">
                  {m.instrument} · {m.genres} · {m.neighborhood}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {results.length === 0 && <li className="py-10 text-center text-smoke">No musicians match &ldquo;{q}&rdquo; yet.</li>}
      </ul>
    </main>
  );
}
