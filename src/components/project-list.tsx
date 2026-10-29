"use client";

import Link from "next/link";
import { useState } from "react";
import { PROVIDER_LABEL } from "@/lib/clips";
import { artworkOf, firstYear, isCurrent, nameWash, trackPlayer, yearsLabel, type Project, type Track } from "@/lib/projects";

type Playing = { track: Track; project: Project };

/**
 * A profile's Journey as a résumé of projects: artwork, name, role and years, then the
 * tracks as play chips. A tapped track plays in a mini player above the tab bar.
 */
export function ProjectList({
  projects,
  editHref,
  onEdit,
  empty,
}: {
  projects: Project[];
  /** Shows an add button in the header (your own profile). */
  editHref?: string;
  /** The editor: compact rows with an edit button instead of play chips. */
  onEdit?: (project: Project) => void;
  empty?: React.ReactNode;
}) {
  const [playing, setPlaying] = useState<Playing | null>(null);
  const since = firstYear(projects);

  return (
    <section className="flex flex-col">
      <div className="flex justify-between items-center pb-1.5">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">Projects</h2>
        {editHref ? (
          <Link href={editHref} aria-label={projects.length ? "Edit projects" : "Add a project"} className="glass size-10 rounded-full flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        ) : (
          since && <span className="text-[13px] text-smoke">Since {since}</span>
        )}
      </div>

      {!projects.length
        ? empty
        : projects.map((p, i) => (
            <ProjectRow
              key={p.id}
              project={p}
              first={i === 0}
              compact={Boolean(onEdit)}
              onEdit={onEdit && (() => onEdit(p))}
              playingId={playing?.track.id}
              onPlay={(track) => setPlaying((now) => (now?.track.id === track.id ? null : { track, project: p }))}
            />
          ))}

      {playing && <MiniPlayer {...playing} onClose={() => setPlaying(null)} />}
    </section>
  );
}

function Artwork({ project, size }: { project: Project; size: number }) {
  const src = artworkOf(project);
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative shrink-0 rounded-2xl overflow-hidden" style={{ width: size, height: size, background: nameWash(project.name) }}>
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}

function ProjectRow({
  project: p,
  first,
  compact,
  onEdit,
  playingId,
  onPlay,
}: {
  project: Project;
  first: boolean;
  compact: boolean;
  onEdit?: () => void;
  playingId?: string;
  onPlay: (t: Track) => void;
}) {
  return (
    <div className={`flex gap-3.5 py-3.5 ${first ? "" : "border-t border-paper/8"}`}>
      <Artwork project={p} size={compact ? 72 : 92} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-semibold truncate">{p.name}</span>
          {isCurrent(p) && !compact && (
            <span className="shrink-0 text-[11px] font-bold tracking-[0.04em] px-[7px] py-0.5 rounded-full bg-[#67E2DA]/16 text-[#67E2DA]">NOW</span>
          )}
        </div>
        {p.role && <span className="text-[14px] text-paper/80 truncate">{p.role}</span>}
        <span className="text-[13px] text-smoke">
          {yearsLabel(p)}
          {compact && ` · ${p.tracks.length} ${p.tracks.length === 1 ? "track" : "tracks"}`}
        </span>
        {!compact && p.tracks.length > 0 && (
          <div className="hscroll flex gap-1.5 mt-2 -mr-5 pr-5">
            {p.tracks.map((t) => (
              <TrackChip key={t.id} track={t} on={playingId === t.id} onPlay={() => onPlay(t)} />
            ))}
          </div>
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${p.name}`}
          className="self-start size-9 rounded-full flex items-center justify-center text-smoke hover:text-paper hover:bg-paper/8 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9l-4-4L4 16z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** One play style everywhere: Paper on glass, Tungsten only while playing. */
function TrackChip({ track, on, onPlay }: { track: Track; on: boolean; onPlay: () => void }) {
  const playable = Boolean(trackPlayer(track));
  const title = track.title || `${PROVIDER_LABEL[track.provider]} track`;
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={!playable}
      aria-pressed={on}
      aria-label={`${on ? "Pause" : "Play"} ${title}`}
      className={`h-[34px] shrink-0 flex items-center gap-[7px] pl-1 pr-3 rounded-full border text-[13px] font-semibold transition disabled:cursor-default ${
        on ? "border-paper/40 bg-paper/14" : "border-paper/14 hover:border-paper/30"
      }`}
    >
      <span className={`size-[26px] rounded-full flex items-center justify-center ${on ? "bg-tungsten text-ink" : "bg-paper/16 text-paper"}`}>
        {on ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
        )}
      </span>
      {title}
      <span className="font-medium text-smoke">{PROVIDER_LABEL[track.provider]}</span>
    </button>
  );
}

/** Floats above the tab bar so the profile stays in view while a track plays. */
function MiniPlayer({ track, project, onClose }: Playing & { onClose: () => void }) {
  const player = trackPlayer(track);
  if (!player) return null;
  const title = track.title || `${PROVIDER_LABEL[track.provider]} track`;
  return (
    <div className="fixed z-30 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[408px] bottom-[calc(max(env(safe-area-inset-bottom),16px)+74px)] glass rounded-[24px] p-2 flex flex-col gap-2 shadow-[0_12px_40px_rgb(0_0_0/0.5)]">
      <div className="flex items-center gap-3 pl-1">
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[14px] font-semibold truncate">{title}</span>
          <span className="text-[12px] text-smoke truncate">
            {project.name} · {PROVIDER_LABEL[track.provider]}
          </span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close player" className="size-9 rounded-full bg-paper/12 flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <iframe
        key={player.embed}
        src={player.embed}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        style={player.height ? { height: player.height } : undefined}
        className={`border-0 rounded-2xl w-full ${player.height ? "" : player.shape === "tall" ? "max-h-[50dvh] aspect-[9/16] w-auto mx-auto" : "aspect-video"}`}
      />
    </div>
  );
}
