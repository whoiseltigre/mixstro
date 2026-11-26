"use client";

import { useEffect, useState } from "react";
import type { FoundArtist } from "@/lib/music-finder";

/**
 * "Is this you?" for solo musicians: type the name you release under and we look it up on
 * Apple Music (and YouTube when set up). One tap adds your songs, no link hunting.
 */
export function FindMyMusic({ onAdd, disabled }: { onAdd: (urls: string[]) => void; disabled?: boolean }) {
  const [name, setName] = useState("");
  const [found, setFound] = useState<{ q: string; artists: FoundArtist[] }>({ q: "", artists: [] });
  const [skipped, setSkipped] = useState<string[]>([]);
  const [looking, setLooking] = useState(false);
  const [added, setAdded] = useState<string>();
  const term = name.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLooking(true);
      try {
        const url = new URL("/api/music/find", window.location.origin);
        url.searchParams.set("name", term);
        const res = await fetch(url, { signal: ctrl.signal });
        const body = (await res.json()) as { artists?: FoundArtist[] };
        setFound({ q: term, artists: (body.artists ?? []).filter((a) => a.tracks.length) });
      } catch {}
      if (!ctrl.signal.aborted) setLooking(false);
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  const match = found.q === term ? found.artists.find((a) => !skipped.includes(a.id)) : undefined;
  const exhausted = found.q === term && term.length > 1 && !looking && !match;

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor="artist-name" className="text-footnote font-semibold text-smoke">
        Released music? Find it by your artist name
      </label>
      <input
        id="artist-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setAdded(undefined);
        }}
        disabled={disabled}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="The name on Apple Music or Spotify"
        className="field-search h-[52px] px-4 text-body"
      />

      {added ? (
        <p className="text-footnote text-gel-teal px-1">Added {added}&apos;s songs. They play right on your profile.</p>
      ) : match ? (
        <div key={match.id} className="rise-in glass !bg-[rgb(26_24_22/0.7)] rounded-panel p-4 flex flex-col gap-3.5 relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-30" style={{ background: "radial-gradient(70% 100% at 50% 0%, #FFB245, transparent)" }} />
          <div className="relative flex items-center gap-3">
            <Cover src={match.image ?? match.tracks[0]?.thumb} size={56} round />
            <span className="flex-1 flex flex-col min-w-0">
              <span className="text-caption font-semibold uppercase tracking-[0.12em] text-gel-pink">Is this you?</span>
              <span className="text-title4 font-medium leading-tight truncate">{match.name}</span>
              {match.genre && <span className="text-footnote text-smoke">{match.genre}</span>}
            </span>
          </div>
          <ul className="relative flex flex-col gap-1.5">
            {match.tracks.slice(0, 3).map((t) => (
              <li key={t.url} className="flex items-center gap-2.5">
                <Cover src={t.thumb} size={36} />
                <span className="flex-1 text-subhead truncate">{t.title}</span>
                <span className="text-caption text-smoke shrink-0">{t.source}</span>
              </li>
            ))}
          </ul>
          <div className="relative grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSkipped((s) => [...s, match.id])} className="h-11 rounded-full border border-paper/20 text-callout hover:border-paper/40 transition">
              Not me
            </button>
            <button
              type="button"
              onClick={() => {
                onAdd(match.tracks.slice(0, 3).map((t) => t.url));
                setAdded(match.name);
                setName("");
              }}
              className="press h-11 rounded-full bg-paper text-ink text-callout font-semibold"
            >
              Yes, add my songs
            </button>
          </div>
        </div>
      ) : looking ? (
        <p className="text-footnote text-smoke px-1">Looking for {term}&apos;s music…</p>
      ) : exhausted ? (
        <p className="text-footnote text-smoke px-1">We couldn&apos;t find that name. Paste a link instead, or record 30 seconds below.</p>
      ) : null}
    </div>
  );
}

function Cover({ src, size, round }: { src?: string; size: number; round?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className={`${round ? "rounded-full" : "rounded-xs"} object-cover shrink-0 bg-riser`} style={{ width: size, height: size }} />
  ) : (
    <span className={`${round ? "rounded-full" : "rounded-xs"} bg-riser shrink-0`} style={{ width: size, height: size }} />
  );
}
