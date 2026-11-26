"use client";

import Link from "next/link";
import { useState } from "react";
import { ListenOn, Waveform, usePlayer, useDetails, type PlayRequest } from "@/components/player";
import { PROVIDER_LABEL } from "@/lib/clips";
import { artistTint } from "@/lib/artists";
import { artworkOf, firstYear, isCurrent, nameWash, trackPlayer, yearsLabel, type Bandmate, type Project, type Track } from "@/lib/projects";
import { parseClip } from "@/lib/clips";
import { FadeImg } from "@/components/fade-image";
import { PlayGlyph } from "@/components/ui";

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
 * A profile's projects as a record shelf: every band and project is a big cover you flip
 * through. Tap a record to see its songs; a tapped song plays in the mini player above the
 * tab bar. (The editor keeps compact rows with an edit button.)
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

  const playingId = player?.now && (player.playing || player.now.mode !== "audio") ? player.now.id : undefined;
  const plus = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );

  return (
    <section className="flex flex-col gap-3 min-w-0">
      <div className="flex justify-between items-center">
        <h2 className="text-title3 font-semibold tracking-[-0.01em]">Projects</h2>
        {editHref ? (
          <Link href={editHref} aria-label={projects.length ? "Edit projects" : "Add a project"} className="glass size-11 rounded-full flex items-center justify-center">
            {plus}
          </Link>
        ) : (
          since && <span className="text-footnote text-smoke">Since {since}</span>
        )}
      </div>

      {signature && <SignatureTrack {...signature} />}

      {!projects.length ? (
        empty
      ) : onEdit ? (
        <div className="flex flex-col">
          {projects.map((p, i) => (
            <ProjectRow key={p.id} project={p} first={i === 0} onEdit={() => onEdit(p)} />
          ))}
        </div>
      ) : (
        <RecordShelf projects={projects} playingId={playingId} onPlay={(track, p) => player?.play(playRequest(track, p))} addHref={editHref} />
      )}
    </section>
  );
}

/** The shelf: big covers side by side, and the picked record's songs underneath. */
function RecordShelf({ projects, playingId, onPlay, addHref }: { projects: Project[]; playingId?: string; onPlay: (t: Track, p: Project) => void; addHref?: string }) {
  const [picked, setPicked] = useState<string>((projects.find((p) => p.tracks.length) ?? projects[0]).id);
  const open = projects.find((p) => p.id === picked) ?? projects[0];
  return (
    <>
      <ul className="hscroll flex gap-3.5 -mx-5 px-5 md:mx-0 md:px-0 snap-x snap-mandatory scroll-px-5 md:scroll-px-0 pb-1">
        {projects.map((p) => {
          const on = p.id === open.id;
          return (
            <li key={p.id} className="snap-start shrink-0 w-[164px] md:w-[188px]">
              <button type="button" onClick={() => setPicked(p.id)} aria-pressed={on} className="press-card w-full flex flex-col gap-2.5 text-left">
                <span className={`relative block w-full aspect-square rounded-card overflow-hidden transition ${on ? "outline-2 outline-offset-[3px] outline-paper" : "outline-0"}`}>
                  <Cover project={p} />
                  {isCurrent(p) && <span className="absolute left-2.5 top-2.5 glass-thick h-7 px-2.5 rounded-full text-caption font-semibold flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-gel-teal" aria-hidden="true" />Now</span>}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-callout font-semibold truncate">{p.name}</span>
                  <span className="text-footnote text-smoke truncate">{[p.role, yearsLabel(p)].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            </li>
          );
        })}
        {addHref && (
          <li className="snap-start shrink-0 w-[164px] md:w-[188px]">
            <Link href={addHref} className="press-card flex flex-col gap-2.5">
              <span className="w-full aspect-square rounded-card border border-dashed border-paper/25 flex items-center justify-center text-smoke">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </span>
              <span className="text-callout font-semibold">Add a project</span>
            </Link>
          </li>
        )}
      </ul>

      <div className="rounded-card-lg bg-stage border border-paper/8 overflow-hidden">
        <div className="px-4 pt-3.5 pb-2 flex flex-col gap-0.5">
          {open.bandId ? (
            <Link href={`/b/${open.bandId}`} className="self-start text-body font-semibold hover:underline underline-offset-2">{open.name}</Link>
          ) : (
            <span className="text-body font-semibold">{open.name}</span>
          )}
          {open.bandmates && open.bandmates.length > 0 && <PlayedWith mates={open.bandmates} linked />}
        </div>
        {open.tracks.length ? (
          <ul className="flex flex-col">
            {open.tracks.map((t, i) => (
              <li key={t.id} className="border-t border-paper/8">
                <TrackRow n={i + 1} track={t} on={playingId === t.id} onPlay={() => onPlay(t, open)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-4 text-footnote text-smoke">No songs on this one yet.</p>
        )}
      </div>
    </>
  );
}

/** A record's cover: its artwork, or a sleeve in the project's own color with its name set large. */
function Cover({ project }: { project: Project }) {
  const src = artworkOf(project);
  const [failed, setFailed] = useState(false);
  return (
    <span className="absolute inset-0" style={{ background: nameWash(project.name) }}>
      <span aria-hidden="true" className="absolute -right-[38%] -bottom-[38%] size-[92%] rounded-full opacity-35" style={{ background: "repeating-radial-gradient(circle, transparent 0 5px, rgb(15 13 11 / 0.55) 5px 6px)" }} />
      <span aria-hidden="true" className="absolute inset-x-3.5 bottom-3 headline text-title-lg leading-[0.95] text-paper/90 line-clamp-3 break-words">{project.name}</span>
      {src && !failed && <FadeImg src={src} alt="" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />}
    </span>
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

function ProjectRow({ project: p, first, onEdit }: { project: Project; first: boolean; onEdit: () => void }) {
  return (
    <div className={`flex items-center gap-3.5 py-3 ${first ? "" : "border-t border-paper/8"}`}>
      <Artwork project={p} size={64} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-body font-semibold truncate">{p.name}</span>
        {p.role && <span className="text-subhead text-paper/80 truncate">{p.role}</span>}
        <span className="text-footnote text-smoke">
          {yearsLabel(p)} · {p.tracks.length} {p.tracks.length === 1 ? "song" : "songs"}
        </span>
        {p.bandmates && p.bandmates.length > 0 && <PlayedWith mates={p.bandmates} linked={false} />}
      </div>
      <button type="button" onClick={onEdit} aria-label={`Edit ${p.name}`} className="glass size-11 rounded-full flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16z" />
        </svg>
      </button>
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

/** One song on a record: a full-width row, Paper on glass, Tungsten only while it plays. */
function TrackRow({ n, track, on, onPlay }: { n: number; track: Track; on: boolean; onPlay: () => void }) {
  const playable = Boolean(trackPlayer(track));
  const title = track.title || `${PROVIDER_LABEL[track.provider]} track`;
  const cls = "w-full min-h-[52px] px-4 flex items-center gap-3 text-left transition hover:bg-paper/5";
  const text = (
    <>
      <span className="w-4 text-footnote text-smoke tabular-nums text-center shrink-0">{n}</span>
      <span className="flex-1 min-w-0 text-callout font-medium truncate">{title}</span>
      <span className="text-footnote text-smoke shrink-0">{PROVIDER_LABEL[track.provider]}</span>
    </>
  );
  if (!playable && track.url) {
    // No in-app player for this link (yet): open it on the platform instead.
    return (
      <a href={track.url} target="_blank" rel="noopener noreferrer" className={cls}>
        {text}
        <span className="size-8 rounded-full bg-paper/12 flex items-center justify-center shrink-0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
        </span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onPlay} disabled={!playable} aria-pressed={on} aria-label={`${on ? "Pause" : "Play"} ${title}`} className={`${cls} disabled:cursor-default`}>
      {text}
      <span className={`size-8 rounded-full flex items-center justify-center shrink-0 ${on ? "bg-tungsten text-ink" : "bg-paper/12 text-paper"}`}>
        <PlayGlyph playing={on} size={11} />
      </span>
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
      <span className="relative text-caption font-semibold uppercase tracking-[0.1em] text-smoke">Signature track</span>
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
