"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PROVIDER_LABEL, parseClip, type ClipProvider, type ParsedClip } from "@/lib/clips";
import { PLATFORM_LABEL, PLATFORM_ORDER, type TrackDetails } from "@/lib/music-track";
import { trackPlayer } from "@/lib/projects";
import { FadeImg } from "@/components/fade-image";
import { PlayButton } from "@/components/ui";

/**
 * The Mixstro player: one look for every song on Mixstro, whatever service it lives on.
 * Songs play a 30-second preview in our own player (Apple Music or Deezer previews, found
 * by name) with "Listen in full on…" links; videos and anything without a preview fall back
 * to the platform's own embed. It lives in the root layout, so it keeps playing while you browse.
 */

/** `at` starts a recording or video at that second (a clip reply's moment). Song previews are excerpts, so they start at the top. */
export type PlayRequest = { id: string; url: string; provider: ClipProvider; title?: string; sub?: string; artwork?: string; at?: number | null };
type Now = PlayRequest & { details?: TrackDetails; mode: "loading" | "audio" | "embed" };

type Player = {
  now: Now | null;
  playing: boolean;
  progress: number;
  play: (req: PlayRequest) => void;
  toggle: () => void;
  seek: (fraction: number) => void;
  close: () => void;
};

const Ctx = createContext<Player | null>(null);
export const usePlayer = () => useContext(Ctx);

/** Songs we play as audio. Videos (YouTube, TikTok, Instagram) keep their own player. */
const AUDIO: ClipProvider[] = ["spotify", "apple_music", "soundcloud", "bandcamp", "upload"];
// A silent clip, played on the tap itself so phones let us start the real audio a moment later.
const SILENCE = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAABgAAAykAWlpaWlpaWlpaWlpaWlpaWnt7e3t7e3t7e3t7e3t7e3t7nJycnJycnJycnJycnJycnL29vb29vb29vb29vb29vb293t7e3t7e3t7e3t7e3t7e3t7/////////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQCowAAAAAAAAMpso+sIAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=";

const cache = new Map<string, Promise<TrackDetails>>();

/**
 * Details for a link, fetched once per page load and shared by everyone asking at the same
 * time. A failed or rate-limited answer isn't kept, so the next tap tries again.
 */
export function loadDetails(url: string): Promise<TrackDetails> {
  let p = cache.get(url);
  if (!p) {
    const forget = () => {
      cache.delete(url);
      return { links: {} } as TrackDetails;
    };
    p = fetch(`/api/music/track?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? (r.json() as Promise<TrackDetails>) : forget()))
      .catch(forget);
    cache.set(url, p);
  }
  return p;
}

export function useDetails(url?: string) {
  const [details, setDetails] = useState<TrackDetails>();
  useEffect(() => {
    if (!url) return;
    let live = true;
    loadDetails(url).then((d) => live && setDetails(d));
    return () => {
      live = false;
    };
  }, [url]);
  return details;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState<Now | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const latest = useRef<string>("");

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    audio.current = a;
    const tick = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const on = () => setPlaying(!a.src.startsWith("data:") && !a.paused);
    a.addEventListener("timeupdate", tick);
    a.addEventListener("play", on);
    a.addEventListener("pause", on);
    a.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(1);
    });
    return () => {
      a.pause();
      audio.current = null;
    };
  }, []);

  const startAudio = useCallback((src: string, at?: number | null) => {
    const a = audio.current;
    if (!a) return;
    a.src = src;
    setProgress(0);
    if (at) {
      const jump = () => {
        if (a.src === src || a.currentSrc === src) a.currentTime = Math.min(at, Math.max(0, (a.duration || at) - 0.5));
      };
      a.addEventListener("loadedmetadata", jump, { once: true });
    }
    a.play().catch(() => setPlaying(false));
  }, []);

  const play = useCallback(
    (req: PlayRequest) => {
      const a = audio.current;
      // Same song: play or pause it (or jump to a new moment in it).
      if (now?.id === req.id) {
        if (now.mode === "audio" && a && req.at != null && req.at !== now.at) {
          a.currentTime = req.at;
          setNow({ ...now, at: req.at });
          if (a.paused) a.play().catch(() => {});
          return;
        }
        if (now.mode === "embed" && req.at != null && req.at !== now.at) return setNow({ ...now, at: req.at });
        if (now.mode === "audio" && a) {
          if (a.paused) a.play().catch(() => {});
          else a.pause();
        }
        return;
      }
      latest.current = req.id;
      a?.pause();
      setProgress(0);
      const audioFirst = AUDIO.includes(req.provider);
      if (!audioFirst) return setNow({ ...req, mode: "embed" });
      if (req.provider === "upload") {
        setNow({ ...req, mode: "audio" });
        return startAudio(req.url, req.at);
      }
      // Unlock playback inside the tap, then swap in the preview once we know it.
      if (a) {
        a.src = SILENCE;
        a.play().catch(() => {});
      }
      setNow({ ...req, mode: "loading" });
      loadDetails(req.url).then((details) => {
        if (latest.current !== req.id) return;
        const artwork = req.artwork ?? details.artwork;
        if (details.preview) {
          setNow({ ...req, artwork, details, mode: "audio" });
          startAudio(details.preview);
        } else {
          a?.pause();
          setNow({ ...req, artwork, details, mode: "embed" });
        }
      });
    },
    [now, startAudio],
  );

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || now?.mode !== "audio") return;
    if (a.paused) {
      if (a.ended) a.currentTime = 0;
      a.play().catch(() => {});
    } else a.pause();
  }, [now]);

  const seek = useCallback((f: number) => {
    const a = audio.current;
    if (a?.duration) a.currentTime = Math.max(0, Math.min(1, f)) * a.duration;
  }, []);

  const close = useCallback(() => {
    latest.current = "";
    audio.current?.pause();
    setNow(null);
    setPlaying(false);
  }, []);

  const value = useMemo(() => ({ now, playing, progress, play, toggle, seek, close }), [now, playing, progress, play, toggle, seek, close]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {now && <MiniPlayer />}
    </Ctx.Provider>
  );
}

/** Pages with the tab bar keep the player just above it; public pages put it at the bottom. */
function useAboveTabBar() {
  const path = usePathname() ?? "";
  return !/^\/(@|p\/|b\/|blog|join|onboarding|auth|privacy|terms)|^\/$/.test(path);
}

function MiniPlayer() {
  const p = usePlayer()!;
  const now = p.now!;
  const [open, setOpen] = useState(false);
  const above = useAboveTabBar();
  const parsed: (ParsedClip & { height?: number }) | null = now.mode === "embed" ? (trackPlayer({ id: now.id, provider: now.provider, url: now.url }) ?? parseClip(now.url)) : null;
  // YouTube honours a start time; other embeds open at the top.
  const embed = parsed && now.at && parsed.provider === "youtube" && parsed.embed ? { ...parsed, embed: `${parsed.embed}&start=${Math.floor(now.at)}` } : parsed;
  const links = PLATFORM_ORDER.filter((k) => now.details?.links[k]);
  const title = now.title || now.details?.title || `${PROVIDER_LABEL[now.provider]} track`;
  const sub = now.sub ?? now.details?.artist;

  return (
    <div
      role="region"
      aria-label="Now playing"
      className={`fixed z-30 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[408px] glass !bg-[rgb(26_24_22/0.82)] rounded-panel p-2 flex flex-col gap-2 shadow-float md:bottom-6 ${
        above ? "bottom-[calc(max(env(safe-area-inset-bottom),16px)+74px)]" : "bottom-[calc(max(env(safe-area-inset-bottom),16px))]"
      }`}
    >
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Show less" : "Show more"} className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <Cover src={now.artwork ?? now.details?.artwork} size={44} />
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-subhead font-semibold truncate">{title}</span>
            <span className="text-caption text-smoke truncate">
              {now.mode === "loading" ? "Finding the song…" : now.mode === "audio" && now.provider !== "upload" ? `${sub ? `${sub} · ` : ""}Preview` : sub ?? PROVIDER_LABEL[now.provider]}
            </span>
          </span>
        </button>
        {now.mode === "audio" && (
          <PlayButton playing={p.playing} size={40} onClick={p.toggle} />
        )}
        {now.mode === "loading" && <span aria-hidden="true" className="size-10 rounded-full border-2 border-paper/20 border-t-tungsten animate-spin shrink-0" />}
        <button type="button" onClick={p.close} aria-label="Close player" className="hit-slop relative size-9 rounded-full bg-paper/12 flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      {now.mode === "audio" && (
        <div className="h-[3px] mx-1 rounded-full bg-paper/15 overflow-hidden" aria-hidden="true">
          <div className="h-full bg-tungsten transition-[width] duration-200 ease-linear" style={{ width: `${p.progress * 100}%` }} />
        </div>
      )}

      {embed?.embed && (
        <iframe
          key={embed.embed}
          src={embed.embed}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={embed.height ? { height: embed.height } : undefined}
          className={`border-0 rounded-2xl w-full ${embed.height ? "" : embed.shape === "tall" ? "max-h-[50dvh] aspect-[9/16] w-auto mx-auto" : "aspect-video"}`}
        />
      )}

      {(open || now.mode === "embed") && links.length > 0 && <ListenOn links={now.details!.links} className="px-1 pb-1" />}
    </div>
  );
}

/** "Listen in full on Spotify, Apple Music…": exact links only, never a search. */
export function ListenOn({ links, className = "" }: { links: TrackDetails["links"]; className?: string }) {
  const keys = PLATFORM_ORDER.filter((k) => links[k]);
  if (!keys.length) return null;
  return (
    <div className={`flex items-center gap-1.5 flex-wrap text-caption text-smoke ${className}`}>
      <span className="mr-0.5">Listen in full on</span>
      {keys.map((k) => (
        <a key={k} href={links[k]} target="_blank" rel="noopener noreferrer" className="hit-slop relative h-7 px-2.5 rounded-full bg-paper/10 hover:bg-paper/18 text-paper font-semibold flex items-center transition">
          {PLATFORM_LABEL[k]}
        </a>
      ))}
    </div>
  );
}

export function Cover({ src, size, round, className = "" }: { src?: string; size: number; round?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative shrink-0 overflow-hidden bg-riser ${round ? "rounded-full" : size > 48 ? "rounded-field" : "rounded-xs"} ${className}`} style={{ width: size, height: size }}>
      {src && !failed && <FadeImg src={src} alt="" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />}
    </span>
  );
}

/** A waveform drawn from the song's id, so it's the same shape every time; fills as it plays. */
export function Waveform({ seed, progress = 0, onSeek, bars = 48 }: { seed: string; progress?: number; onSeek?: (f: number) => void; bars?: number }) {
  const heights = useMemo(() => {
    let h = 7;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 233280;
    return Array.from({ length: bars }, (_, i) => {
      h = (h * 9301 + 49297) % 233280;
      const envelope = 0.45 + 0.55 * Math.abs(Math.sin((i / bars) * Math.PI * 2.2 + 0.4));
      return Math.max(0.16, (h / 233280) * envelope);
    });
  }, [seed, bars]);
  return (
    <div
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek" : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      aria-hidden={onSeek ? undefined : true}
      tabIndex={onSeek ? 0 : undefined}
      onClick={(e) => {
        if (!onSeek) return;
        const r = e.currentTarget.getBoundingClientRect();
        onSeek((e.clientX - r.left) / r.width);
      }}
      onKeyDown={(e) => {
        if (!onSeek) return;
        if (e.key === "ArrowRight") onSeek(progress + 0.05);
        if (e.key === "ArrowLeft") onSeek(progress - 0.05);
      }}
      className={`h-9 flex items-center gap-[2px] ${onSeek ? "cursor-pointer" : ""}`}
    >
      {heights.map((v, i) => (
        <span key={i} className={`flex-1 rounded-full transition-colors ${i / bars < progress ? "bg-tungsten" : "bg-paper/25"}`} style={{ height: `${v * 100}%` }} />
      ))}
    </div>
  );
}
