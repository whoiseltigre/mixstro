"use client";

import Link from "next/link";
import { useState } from "react";
import { ListenOn, Waveform, usePlayer, useDetails, type PlayRequest } from "@/components/player";
import { PROVIDER_LABEL } from "@/lib/clips";
import { artistTint } from "@/lib/artists";
import { artworkOf, firstYear, isCurrent, nameWash, trackPlayer, yearsLabel, type Bandmate, type Project, type Track } from "@/lib/projects";
import { parseClip } from "@/lib/clips";
import { FadeImg } from "@/components/fade-image";

const playRequest = (track: Track, project: Project): PlayRequest => ({
  id: track.id,
  url: track.url!,
  provider: track.provider,
  title: track.title,
  sub: project.name,
  artwork: track.thumb ?? artworkOf(project),
});

/** The song a profile leads with: the first song (not video) from what they play in now, else their latest. */
function signatureOf(projects: Project[]): { track: Track; project: Project } | undefined {
  const songs = projects.flatMap((p) => p.tracks.filter((t) => t.url && parseClip(t.url)?.shape === "square").map((track) => ({ track, project: p })));
  return songs[0];
}

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
  const player = usePlayer();
  const since = firstYear(projects);
  const signature = onEdit ? undefined : signatureOf(projects);

  return (
    <section className="flex flex-col">
      <div className="flex justify-between items-center pb-1.5">
        <h2 className="text-title3 font-bold tracking-[-0.02em]">Projects</h2>
        {editHref ? (
          <Link href={editHref} aria-label={projects.length ? "Edit projects" : "Add a project"} className="hit-slop relative glass size-10 rounded-full flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        ) : (
          since && <span className="text-footnote text-smoke">Since {since}</span>
        )}
      </div>

      {signature && <SignatureTrack {...signature} />}

      {!projects.length
        ? empty
        : projects.map((p, i) => (
            <ProjectRow
              key={p.id}
              project={p}
              first={i === 0}
              compact={Boolean(onEdit)}
              onEdit={onEdit && (() => onEdit(p))}
              playingId={player?.now && (player.playing || player.now.mode !== "audio") ? player.now.id : undefined}
              onPlay={(track) => player?.play(playRequest(track, p))}
            />
          ))}
    </section>
  );
}

function Artwork({ project, size }: { project: Project; size: number }) {
  const src = artworkOf(project);
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative shrink-0 rounded-2xl overflow-hidden" style={{ width: size, height: size, background: nameWash(project.name) }}>
      {src && !failed && (
         
        <FadeImg src={src} alt="" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
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
          {p.bandId && !compact ? (
            <Link href={`/b/${p.bandId}`} className="text-body font-semibold truncate hover:underline underline-offset-2">
              {p.name}
            </Link>
          ) : (
            <span className="text-body font-semibold truncate">{p.name}</span>
          )}
          {isCurrent(p) && !compact && (
            <span className="shrink-0 text-caption2 font-bold tracking-[0.04em] px-[7px] py-0.5 rounded-full bg-gel-teal/16 text-gel-teal">NOW</span>
          )}
        </div>
        {p.role && <span className="text-subhead text-paper/80 truncate">{p.role}</span>}
        <span className="text-footnote text-smoke">
          {yearsLabel(p)}
          {compact && ` · ${p.tracks.length} ${p.tracks.length === 1 ? "track" : "tracks"}`}
        </span>
        {p.bandmates && p.bandmates.length > 0 && <PlayedWith mates={p.bandmates} linked={!compact} />}
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
          className="hit-slop relative self-start size-9 rounded-full flex items-center justify-center text-smoke hover:text-paper hover:bg-paper/8 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9l-4-4L4 16z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** "With Maya and Jo": the band's other confirmed members, each linking to their page. */
function PlayedWith({ mates, linked }: { mates: Bandmate[]; linked: boolean }) {
  const shown = mates.slice(0, 3);
  return (
    <div className="flex items-center gap-2 mt-1.5 min-w-0">
      <span className="flex -space-x-1.5 shrink-0">
        {shown.map((m) => (
          <span key={m.username} className="relative size-[22px] rounded-full overflow-hidden border-2 border-ink bg-riser flex items-center justify-center text-caption2 font-bold" style={{ background: artistTint(m.username) }}>
            {m.photo ? (
               
              <FadeImg src={m.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
            ) : (
              m.name.slice(0, 1)
            )}
          </span>
        ))}
      </span>
      <span className="text-footnote text-smoke truncate">
        With{" "}
        {mates.map((m, i) => (
          <span key={m.username}>
            {i > 0 && (i === mates.length - 1 ? " and " : ", ")}
            {linked ? (
              <Link href={`/m/${m.username}`} className="text-paper/90 font-semibold hover:underline underline-offset-2">{m.name}</Link>
            ) : (
              <span className="text-paper/90 font-semibold">{m.name}</span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
}

/** One play style everywhere: Paper on glass, Tungsten only while playing. */
function TrackChip({ track, on, onPlay }: { track: Track; on: boolean; onPlay: () => void }) {
  const playable = Boolean(trackPlayer(track));
  const title = track.title || `${PROVIDER_LABEL[track.provider]} track`;
  if (!playable && track.url) {
    // No in-app player for this link (yet): open it on the platform instead.
    return (
      <a
        href={track.url}
        target="_blank"
        rel="noopener noreferrer"
        className="h-[34px] shrink-0 flex items-center gap-[7px] pl-1 pr-3 rounded-full border border-paper/14 hover:border-paper/30 text-footnote font-semibold transition"
      >
        <span className="size-[26px] rounded-full flex items-center justify-center bg-paper/16 text-paper">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
        </span>
        {title}
        <span className="font-medium text-smoke">{PROVIDER_LABEL[track.provider]}</span>
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={!playable}
      aria-pressed={on}
      aria-label={`${on ? "Pause" : "Play"} ${title}`}
      className={`h-[34px] shrink-0 flex items-center gap-[7px] pl-1 pr-3 rounded-full border text-footnote font-semibold transition disabled:cursor-default ${
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

/**
 * The signature track: the song a profile leads with, in the Mixstro player. Artwork, a
 * waveform that fills as the preview plays, and "Listen in full on…" for every service we found.
 */
function SignatureTrack({ track, project }: { track: Track; project: Project }) {
  const player = usePlayer();
  const details = useDetails(track.url);
  const on = player?.now?.id === track.id;
  const playing = on && player?.playing;
  const year = details?.year ?? project.endYear ?? project.startYear;
  const title = track.title || details?.title || `${PROVIDER_LABEL[track.provider]} track`;
  return (
    <div className="glass !bg-[rgb(26_24_22/0.7)] rounded-panel p-4 mb-2 flex flex-col gap-3 relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-30" style={{ background: "radial-gradient(70% 100% at 50% 0%, #FFB245, transparent)" }} />
      <span className="relative text-caption2 font-semibold uppercase tracking-[0.14em] text-tungsten">Signature track</span>
      <div className="relative flex items-center gap-3.5">
        <span className="relative size-[60px] shrink-0 rounded-field overflow-hidden" style={{ background: nameWash(project.name) }}>
          {(details?.artwork ?? track.thumb) && <FadeImg src={(details?.artwork ?? track.thumb)!} alt="" className="absolute inset-0 size-full object-cover" />}
        </span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-body-lg font-semibold leading-tight truncate">{title}</span>
          <span className="text-footnote text-smoke truncate">
            {project.name} · {year}
          </span>
        </span>
        <button
          type="button"
          onClick={() => player?.play(playRequest(track, project))}
          aria-label={`${playing ? "Pause" : "Play"} ${title}`}
          className="press size-12 rounded-full bg-paper text-ink flex items-center justify-center shrink-0"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="ml-0.5"><path d="M7 4l13 8-13 8z" /></svg>
          )}
        </button>
      </div>
      <div className="relative">
        <Waveform seed={track.url ?? track.id} progress={on && player?.now?.mode === "audio" ? player.progress : 0} onSeek={on && player?.now?.mode === "audio" ? player.seek : undefined} />
      </div>
      {details && <ListenOn links={details.links} className="relative" />}
    </div>
  );
}
