"use client";

import Link from "next/link";
import { useState } from "react";
import { PROVIDER_LABEL } from "@/lib/clips";
import { byYear, journeyPlayer, journeySpan, yearWash, type JourneyEntry } from "@/lib/journey";

/**
 * A profile's musical history, newest year first, down a single rail. The first year
 * gets the Tungsten dot: it's where the story starts.
 */
export function JourneyTimeline({
  entries,
  editHref,
  onEdit,
  empty,
}: {
  entries: JourneyEntry[];
  /** Shows an Edit link in the header (your own profile). */
  editHref?: string;
  /** Makes each entry editable (the journey editor). */
  onEdit?: (entry: JourneyEntry) => void;
  empty?: React.ReactNode;
}) {
  const groups = byYear(entries);
  const span = journeySpan(entries);
  const first = span?.first;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex justify-between items-baseline gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold">Journey</h2>
          {span && <span className="text-[13px] text-smoke">{span.label}</span>}
        </div>
        {editHref && (
          <Link href={editHref} className="text-[15px] font-semibold underline underline-offset-2">
            {entries.length ? "Edit" : "Add"}
          </Link>
        )}
      </div>

      {!entries.length ? (
        empty
      ) : (
        <ol className="relative flex flex-col gap-6 pl-7">
          <span aria-hidden="true" className="absolute left-[7px] top-3 bottom-3 w-px bg-paper/12" />
          {groups.map(({ year, items }) => (
            <li key={year} className="relative flex flex-col gap-2.5">
              <span
                aria-hidden="true"
                className={`absolute -left-7 top-[10px] size-[15px] rounded-full border-[3px] border-ink ${year === first ? "bg-tungsten" : "bg-riser"}`}
              />
              <div className="flex items-baseline gap-2.5">
                <h3 className="headline text-[26px]">{year}</h3>
                {year === first && groups.length > 1 && <span className="text-[13px] text-smoke">Where it started</span>}
              </div>
              {items.map((e) => (
                <JourneyCard key={e.id} entry={e} onEdit={onEdit && (() => onEdit(e))} />
              ))}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function JourneyCard({ entry, onEdit }: { entry: JourneyEntry; onEdit?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const player = journeyPlayer(entry);
  const label = PROVIDER_LABEL[entry.provider];
  const title = entry.title || `${label} track`;

  return (
    <div className="rounded-[20px] bg-stage border border-paper/8 overflow-hidden">
      <div className="flex gap-3 p-2.5">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={!player}
          aria-label={playing ? `Close ${title}` : `Play ${title}`}
          className="relative size-[68px] shrink-0 rounded-[14px] overflow-hidden flex items-center justify-center disabled:cursor-default"
          style={{ background: yearWash(entry.year) }}
        >
          {entry.thumb && !thumbFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.thumb} alt="" onError={() => setThumbFailed(true)} className="absolute inset-0 size-full object-cover" />
          )}
          {player && (
            <span className="relative glass size-9 rounded-full flex items-center justify-center">
              {playing ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
              )}
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5 py-0.5">
          <span className="text-[15px] font-semibold leading-snug line-clamp-2">{title}</span>
          <span className="text-[12px] text-smoke">{label}</span>
          {entry.note && <p className="pt-1 text-[14px] leading-snug text-paper/80">{entry.note}</p>}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${title}`}
            className="self-start size-9 rounded-full flex items-center justify-center text-smoke hover:text-paper hover:bg-paper/8 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
        )}
      </div>
      {playing && player && (
        <div className={player.height ? "px-2.5 pb-2.5" : "px-2.5 pb-2.5 flex justify-center"}>
          <iframe
            src={player.embed}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            style={player.height ? { height: player.height } : undefined}
            className={`border-0 rounded-xl w-full ${player.height ? "" : player.shape === "tall" ? "max-w-[260px] aspect-[9/16]" : "aspect-video"}`}
          />
        </div>
      )}
    </div>
  );
}
