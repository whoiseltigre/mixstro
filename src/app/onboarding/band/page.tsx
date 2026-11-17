"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, Field } from "@/components/ui";
import { parseClip } from "@/lib/clips";
import { headlineFor } from "@/lib/instruments";
import { type Draft, STEP_GLOW, stepNav, useDraft } from "@/lib/onboarding";
import type { FoundArtist } from "@/lib/music-finder";

const GLOW = STEP_GLOW.band;

/** Band signups only: the band's name, since when, your part in it, and one link to its music. Becomes its band page. */
export default function Band() {
  const router = useRouter();
  const { draft, update, ready } = useDraft();
  const nav = stepNav("band", draft);
  const now = new Date().getFullYear();
  const band = draft.band ?? { name: "", since: now };
  const link = band.link?.trim() ?? "";
  const linkOk = !link || Boolean(parseClip(link));
  const ok = band.name.trim().length > 0 && linkOk;

  // Start "your part" from what you play, e.g. "Cellist and guitarist".
  useEffect(() => {
    if (ready && !draft.band?.role) update((d) => ({ band: { name: "", since: now, ...d.band, role: headlineFor(d.instruments, d.mainInstrument) } }));
    // Once, when the draft has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const set = (patch: Partial<typeof band>) => update((d) => ({ band: { name: "", since: now, ...d.band, ...patch } }));

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={GLOW} />
      <StepTitle eyebrow="Your band" color={GLOW} title="Tell us about the band" sub="Type the name and we'll look for your music. This becomes your band's page, and you can invite bandmates from it." />
      <div className="px-5 pt-7 flex flex-col gap-5">
        <Field id="band-name" label="Band name" placeholder="The Midnight Static" value={band.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />
        <MusicFinder name={band.name} band={band} set={set} />
        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3 items-end">
          <Field id="band-role" label="Your part" placeholder="Lead guitar, backing vocals" value={band.role ?? ""} onChange={(e) => set({ role: e.target.value })} maxLength={80} />
          <div className="flex flex-col gap-2">
            <label htmlFor="band-since" className="text-[13px] font-semibold text-smoke">
              Since
            </label>
            <select
              id="band-since"
              value={band.since}
              onChange={(e) => set({ since: Number(e.target.value) })}
              className="h-[52px] w-full rounded-2xl bg-stage border border-paper/12 px-3 text-[17px] text-paper outline-none focus:border-paper/50"
            >
              {Array.from({ length: now - 1969 }, (_, i) => now - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Field
          id="band-link"
          label={band.tracks?.length ? "Add another link (optional)" : "Or paste a link to your music"}
          placeholder="Spotify, YouTube, SoundCloud, Bandcamp…"
          inputMode="url"
          autoCapitalize="none"
          value={band.link ?? ""}
          onChange={(e) => set({ link: e.target.value })}
          hint={linkOk ? undefined : "We can't play that link yet. Try Spotify, YouTube, SoundCloud or Bandcamp."}
        />
        <div className="rounded-[20px] p-4 flex items-center gap-3" style={{ background: `color-mix(in srgb, ${GLOW} 10%, var(--color-stage))` }}>
          <span className="size-9 rounded-full flex items-center justify-center text-ink shrink-0" style={{ background: GLOW }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <p className="text-[13.5px] text-smoke text-pretty">
            <span className="text-paper">Bandmates confirm their own spot.</span> You&apos;ll get an invite link to send them once you&apos;re in.
          </p>
        </div>
      </div>
      <StepFooter>
        <Button disabled={!ok} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}

type BandDraft = NonNullable<Draft["band"]>;

/**
 * Type the band name once and we look for its music on Apple Music (and YouTube when set up),
 * then ask "Is this you?". One tap links its songs; "Not us" shows the next match.
 */
function MusicFinder({ name, band, set }: { name: string; band: BandDraft; set: (patch: Partial<BandDraft>) => void }) {
  const [found, setFound] = useState<{ q: string; artists: FoundArtist[] }>({ q: "", artists: [] });
  const [skipped, setSkipped] = useState<string[]>([]);
  const [looking, setLooking] = useState(false);
  const term = name.trim();
  const linked = Boolean(band.tracks?.length);

  useEffect(() => {
    if (linked || term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLooking(true);
      try {
        const res = await fetch(`/api/music/find?name=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const body = (await res.json()) as { artists?: FoundArtist[] };
        setFound({ q: term, artists: body.artists ?? [] });
      } catch {}
      if (!ctrl.signal.aborted) setLooking(false);
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, linked]);

  if (linked) {
    return (
      <div className="rise-in rounded-[20px] p-3.5 flex items-center gap-3 border-[1.5px] border-[#FFACBA]/60 bg-[color-mix(in_srgb,#FFACBA_10%,var(--color-stage))]">
        <Cover src={band.photo ?? band.tracks![0].thumb} size={48} round />
        <span className="flex-1 flex flex-col gap-0.5 min-w-0">
          <span className="text-[15px] font-medium flex items-center gap-1.5">
            <span className="size-4 rounded-full bg-[#FFACBA] text-ink flex items-center justify-center"><CheckIcon size={10} /></span>
            {band.tracks!.length} {band.tracks!.length === 1 ? "song" : "songs"} linked
          </span>
          <span className="text-[13px] text-smoke truncate">{band.tracks!.map((t) => t.title).join(" · ")}</span>
        </span>
        <button type="button" onClick={() => set({ tracks: undefined, photo: undefined })} className="text-[13px] text-smoke hover:text-paper px-2">
          Undo
        </button>
      </div>
    );
  }

  const match = found.q === term ? found.artists.find((a) => !skipped.includes(a.id)) : undefined;
  if (!match) {
    return looking && term.length > 1 ? <p className="text-[13px] text-smoke -mt-2">Looking for {term}&apos;s music…</p> : null;
  }

  return (
    <div key={match.id} className="rise-in glass !bg-[rgb(26_24_22/0.7)] rounded-[24px] p-4 flex flex-col gap-3.5 relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-30" style={{ background: "radial-gradient(70% 100% at 50% 0%, #FFACBA, transparent)" }} />
      <div className="relative flex items-center gap-3">
        <Cover src={match.image ?? match.tracks[0]?.thumb} size={56} round />
        <span className="flex-1 flex flex-col">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#FFACBA]">Is this you?</span>
          <span className="text-[18px] font-medium leading-tight">{match.name}</span>
          <span className="text-[12.5px] text-smoke">{[match.genre, match.fans ? `${compact(match.fans)} fans` : null].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
      <ul className="relative flex flex-col gap-1.5">
        {match.tracks.slice(0, 3).map((t) => (
          <li key={t.url} className="flex items-center gap-2.5">
            <Cover src={t.thumb} size={36} />
            <span className="flex-1 text-[14px] truncate">{t.title}</span>
            <span className="text-[11.5px] text-smoke shrink-0">{t.source}</span>
          </li>
        ))}
      </ul>
      <div className="relative grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSkipped((s) => [...s, match.id])} className="h-11 rounded-full border border-paper/20 text-[15px] hover:border-paper/40 transition">
          Not us
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              navigator.vibrate?.(10);
            } catch {}
            set({ name: band.name || match.name, photo: match.image, tracks: match.tracks.slice(0, 3).map(({ title, url, thumb }) => ({ title, url, thumb })) });
          }}
          className="h-11 rounded-full bg-[#FFACBA] text-ink text-[15px] font-medium active:scale-[0.98] transition"
        >
          Yes, that&apos;s us
        </button>
      </div>
    </div>
  );
}

function Cover({ src, size, round }: { src?: string; size: number; round?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className={`${round ? "rounded-full" : "rounded-[9px]"} object-cover shrink-0 bg-riser`} style={{ width: size, height: size }} />
  ) : (
    <span className={`${round ? "rounded-full" : "rounded-[9px]"} bg-riser shrink-0`} style={{ width: size, height: size }} />
  );
}

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact" }).format(n);
