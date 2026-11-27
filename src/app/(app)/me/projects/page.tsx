"use client";

import { useEffect, useState } from "react";
import { ProjectList } from "@/components/project-list";
import { Sheet, SheetCloser } from "@/components/sheet";
import { toast, undoable } from "@/components/toast";
import { BackButton, Button, Field, Toggle } from "@/components/ui";
import { PROVIDER_LABEL, parseClip } from "@/lib/clips";
import { NAME_MAX, ROLE_MAX, TRACKS_MAX, YEARS, thisYear, type Bandmate, type Project, type Track } from "@/lib/projects";
import { findBandmates, inviteBandmate, type Candidate } from "./band-actions";
import { useMyProjects } from "@/lib/projects-store";
import { lookupTrack, resolveLink, searchSongs, type SongHit, type TrackInfo } from "./actions";
import Link from "next/link";
import { FadeImg } from "@/components/fade-image";

type Form = { id?: string; name: string; role: string; startYear: number; endYear: number; current: boolean; tracks: Track[]; bandmates: Bandmate[] };

const blank = (): Form => ({ name: "", role: "", startYear: thisYear(), endYear: thisYear(), current: true, tracks: [], bandmates: [] });
const fromProject = (p: Project): Form => ({
  id: p.id,
  name: p.name,
  role: p.role ?? "",
  startYear: p.startYear,
  endYear: p.endYear ?? thisYear(),
  current: p.endYear === undefined,
  tracks: p.tracks,
  bandmates: p.bandmates ?? [],
});

const selectCls = "field field-inset h-[52px] w-full px-3.5 text-body";

export default function ProjectsEditor() {
  const { projects, ready, save, remove } = useMyProjects();
  const [form, setForm] = useState<Form | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const shown = projects.filter((p) => !hidden.includes(p.id));

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:max-w-[680px] md:mx-auto">
      <div className="mt-2 flex flex-col gap-5">
        <BackButton href="/me" />
        <div className="flex flex-col gap-2">
          <h1 className="headline text-display">Your projects</h1>
          <p className="text-callout text-smoke leading-snug">Every band and project, old or new. Add the name, your role and the years, then link a track or two.</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/me/projects/import" className="press h-12 rounded-full bg-paper text-ink text-body font-semibold flex items-center justify-center">
            Find my releases
          </Link>
          <Button variant="glass" onClick={() => setForm(blank())} className="h-12 text-body">
            Add a project
          </Button>
        </div>
      </div>

      {ready && shown.length > 0 && <ProjectList projects={shown} onEdit={(p) => setForm(fromProject(p))} />}

      {form && (
        <ProjectSheet
          form={form}
          update={(fn) => setForm((f) => f && fn(f))}
          onClose={() => setForm(null)}
          onSave={() =>
            save(
              { name: form.name, role: form.role, startYear: form.startYear, endYear: form.current ? undefined : form.endYear, tracks: form.tracks },
              form.id,
            )
          }
          onRemove={
            form.id
              ? async () => {
                  // Gone straight away; really removed once the Undo window closes.
                  const id = form.id!;
                  const name = form.name.trim() || "Project";
                  setHidden((h) => [...h, id]);
                  undoable({
                    message: `${name} removed`,
                    undo: () => setHidden((h) => h.filter((x) => x !== id)),
                    commit: async () => {
                      const res = await remove(id);
                      setHidden((h) => h.filter((x) => x !== id));
                      if (res.error) toast("Couldn't remove that. Try again.");
                    },
                  });
                  return {};
                }
              : undefined
          }
        />
      )}
    </main>
  );
}

function ProjectSheet({
  form,
  update,
  onClose,
  onSave,
  onRemove,
}: {
  form: Form;
  update: (fn: (f: Form) => Form) => void;
  onClose: () => void;
  onSave: () => Promise<{ error?: string }>;
  onRemove?: () => Promise<{ error?: string }>;
}) {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Form>) => update((f) => ({ ...f, ...patch }));

  async function addTrack(raw: string, known?: { title?: string; thumb?: string }) {
    let clip = parseClip(raw);
    if (!clip && /deezer\./.test(raw)) {
      // Deezer has no player we can use, so find the same song on Apple Music.
      const url = await resolveLink(raw).catch(() => undefined);
      clip = url ? parseClip(url) : null;
    }
    if (!clip) return setError("That link isn't one we can play yet. Try Spotify, Apple Music, YouTube, SoundCloud, Bandcamp or Deezer, or search by song name below.");
    if (form.tracks.some((t) => t.url && parseClip(t.url)?.id === clip.id)) return setError("You already added that one.");
    setError(undefined);
    setLink("");
    const id = crypto.randomUUID();
    const added = clip;
    update((f) => ({ ...f, tracks: [...f.tracks, { id, provider: added.provider, url: added.url, thumb: known?.thumb ?? added.thumb, title: known?.title }] }));
    const info: TrackInfo = await lookupTrack(clip.url).catch(() => ({}));
    // Fill in what the platform knows without overwriting a title typed meanwhile.
    update((f) => ({ ...f, tracks: f.tracks.map((t) => (t.id === id ? { ...t, url: info.url ?? t.url, title: t.title || info.title, thumb: info.thumb ?? t.thumb } : t)) }));
  }

  return (
    <Sheet
      onClose={onClose}
      z="z-40"
      center={false}
      handle={false}
      scrimClassName="bg-ink/60"
      label={form.id ? "Edit project" : "Add a project"}
      className="max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-t-hero bg-stage border-t border-paper/12 shadow-[0_-20px_60px_rgb(0_0_0/0.5)]"
    >
      <SheetCloser>
        {(close) => {
          const run = async (action: () => Promise<{ error?: string }>) => {
            setBusy(true);
            const res = await action();
            setBusy(false);
            if (res.error) setError(res.error);
            else close();
          };
          return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(onSave);
        }}
        aria-label={form.id ? "Edit project" : "Add a project"}
        className="px-5 pt-2.5 pb-safe flex flex-col gap-4"
      >
        <span aria-hidden="true" className="self-center w-[38px] h-[5px] rounded-full bg-paper/25" />
        <div className="flex justify-between items-center">
          <button type="button" onClick={close} className="text-body text-smoke">
            Cancel
          </button>
          <h2 className="text-body-lg font-bold">{form.id ? "Edit project" : "Add a project"}</h2>
          <button type="submit" disabled={busy || !form.name.trim()} className="text-body font-semibold disabled:opacity-40">
            Save
          </button>
        </div>

        <Field id="project-name" label="Band or project" value={form.name} maxLength={NAME_MAX} onChange={(e) => set({ name: e.target.value })} placeholder="Night Shift" required className="text-body bg-ink" />
        <Field id="project-role" label="Your role" value={form.role} maxLength={ROLE_MAX} onChange={(e) => set({ role: e.target.value })} placeholder="Bass, vocals, producer" className="text-body bg-ink" />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-2">
            <label htmlFor="project-from" className="text-footnote font-semibold text-smoke">From</label>
            <select id="project-from" value={form.startYear} onChange={(e) => set({ startYear: Number(e.target.value) })} className={selectCls}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="project-to" className="text-footnote font-semibold text-smoke">To</label>
            {form.current ? (
              <span className={`${selectCls} flex items-center text-smoke`}>Now</span>
            ) : (
              <select id="project-to" value={form.endYear} onChange={(e) => set({ endYear: Number(e.target.value) })} className={selectCls}>
                {YEARS.filter((y) => y >= form.startYear).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center text-callout">
          <span>I still play with them</span>
          <Toggle on={form.current} onChange={() => set({ current: !form.current, endYear: Math.max(form.endYear, form.startYear) })} label="I still play with them" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-footnote font-semibold text-smoke">Tracks</span>
          {form.tracks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-2xl bg-ink border border-paper/8">
              <span className="relative size-10 shrink-0 rounded-xs overflow-hidden bg-riser">
                {t.thumb && (
                   
                  <FadeImg src={t.thumb} alt="" className="absolute inset-0 size-full object-cover" />
                )}
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <input
                  aria-label="Track title"
                  value={t.title ?? ""}
                  maxLength={120}
                  onChange={(e) => update((f) => ({ ...f, tracks: f.tracks.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)) }))}
                  placeholder="Track title"
                  className="bg-transparent text-subhead font-semibold outline-none placeholder:text-smoke/85"
                />
                <span className="text-caption text-smoke">{PROVIDER_LABEL[t.provider]}</span>
              </span>
              <button
                type="button"
                onClick={() => update((f) => ({ ...f, tracks: f.tracks.filter((x) => x.id !== t.id) }))}
                aria-label={`Remove ${t.title || "track"}`}
                className="hit-slop relative size-8 rounded-full flex items-center justify-center text-smoke hover:text-paper"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          ))}
          {form.tracks.length < TRACKS_MAX && (
            <div className="glass h-12 rounded-full flex items-center gap-2 pl-3.5 pr-[5px]">
              <label htmlFor="project-link" className="sr-only">Paste a link to a track</label>
              <input
                id="project-link"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setError(undefined);
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text").trim();
                  if (parseClip(text) || /deezer\./.test(text)) {
                    e.preventDefault();
                    addTrack(text);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (link.trim()) addTrack(link);
                  }
                }}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Paste a link to a track"
                className="flex-1 min-w-0 bg-transparent text-callout outline-none placeholder:text-smoke/85"
              />
              <button type="button" onClick={() => addTrack(link)} disabled={!link.trim()} className="hit-slop relative h-[38px] px-3.5 rounded-full bg-paper text-ink text-subhead font-semibold disabled:opacity-40">
                Add
              </button>
            </div>
          )}
          <span className="text-caption text-smoke text-center">Spotify · Apple Music · YouTube · SoundCloud · Bandcamp · Deezer</span>
          {form.tracks.length < TRACKS_MAX && <SongSearch onPick={(h) => addTrack(h.url, { title: h.title, thumb: h.thumb })} />}
        </div>

        {form.id && <Bandmates projectId={form.id} projectName={form.name} mates={form.bandmates} />}

        {error && (
          <p role="alert" className="text-footnote text-danger">
            {error}
          </p>
        )}
        {onRemove && (
          <button type="button" onClick={() => run(onRemove)} disabled={busy} className="self-center text-subhead font-semibold text-danger disabled:opacity-40 pb-2">
            Remove project
          </button>
        )}
      </form>
          );
        }}
      </SheetCloser>
    </Sheet>
  );
}

/**
 * Tag the people you played with. A member gets an invite in the app; anyone else gets a
 * "Confirm your spot" link from you. Once they confirm, the band shows on both profiles.
 */
function Bandmates({ projectId, projectName, mates }: { projectId: string; projectName: string; mates: Bandmate[] }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Candidate[]>([]);
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setFound([]);
    let live = true;
    const t = setTimeout(async () => {
      const res = await findBandmates(term).catch(() => []);
      if (live) setFound(res.filter((c) => !mates.some((m) => m.username === c.username)));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, mates]);

  async function tag(c: Candidate) {
    setError(undefined);
    const res = await inviteBandmate(projectId, c.id);
    if (res.error) return setError(res.error);
    setInvited((list) => [...list, c.id]);
  }

  async function shareLink() {
    setBusy(true);
    setError(undefined);
    setNote(undefined);
    const res = await inviteBandmate(projectId);
    setBusy(false);
    if (res.error || !res.link) return setError(res.error ?? "Try again.");
    const text = `I added you to ${projectName} on Mixstro. Confirm your spot: ${res.link}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      return; // Cancelled the share sheet.
    }
    try {
      await navigator.clipboard.writeText(text);
      setNote("Link copied. Send it to your bandmate. Each link works for one person.");
    } catch {
      window.prompt("Copy this and send it to your bandmate", text);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-footnote font-semibold text-smoke">Bandmates</span>
      {mates.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {mates.map((m) => (
            <li key={m.username} className="h-8 pl-1 pr-3 rounded-full bg-ink border border-paper/10 flex items-center gap-2 text-footnote font-semibold">
              <span className="relative size-6 rounded-full overflow-hidden bg-riser">
                {m.photo && (
                   
                  <FadeImg src={m.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
                )}
              </span>
              {m.name}
            </li>
          ))}
        </ul>
      )}
      <div className="h-12 rounded-full bg-ink border border-paper/12 flex items-center px-4 focus-within:border-paper/50">
        <label htmlFor="bandmate-q" className="sr-only">Find a bandmate on Mixstro</label>
        <input
          id="bandmate-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          placeholder="Find a bandmate on Mixstro"
          className="flex-1 min-w-0 bg-transparent text-callout outline-none placeholder:text-smoke/85"
        />
      </div>
      {found.length > 0 && (
        <ul className="flex flex-col rounded-2xl bg-ink border border-paper/8 divide-y divide-paper/8">
          {found.map((c) => {
            const done = invited.includes(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                <span className="relative size-9 rounded-full overflow-hidden bg-riser shrink-0">
                  {c.photo && (
                     
                    <FadeImg src={c.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
                  )}
                </span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-subhead font-semibold truncate">{c.name}</span>
                  <span className="text-caption text-smoke truncate">@{c.username} · {c.instrument}</span>
                </span>
                <button type="button" disabled={done} onClick={() => tag(c)} className="hit-slop relative h-8 px-3 rounded-full bg-paper text-ink text-footnote font-semibold disabled:bg-paper/14 disabled:text-paper">
                  {done ? "Invited" : "Tag"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={shareLink} disabled={busy} className="h-11 rounded-full border border-paper/16 text-subhead font-semibold hover:border-paper/40 disabled:opacity-40">
        Not on Mixstro? Send them a link
      </button>
      {(note || invited.length > 0) && (
        <p className="text-caption text-smoke text-center">{note ?? "They'll get an invite to confirm. The band shows on both profiles once they do."}</p>
      )}
      {error && <p role="alert" className="text-footnote text-danger">{error}</p>}
    </div>
  );
}

/** No link handy? Search the song or album by name and tap it. */
function SongSearch({ onPick }: { onPick: (hit: SongHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SongHit[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) return setHits([]);
    let live = true;
    const t = setTimeout(async () => {
      const res = await searchSongs(term).catch(() => []);
      if (live) setHits(res);
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="h-12 rounded-full bg-ink border border-paper/12 flex items-center gap-2 px-4 focus-within:border-paper/50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-smoke shrink-0" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></svg>
        <label htmlFor="song-q" className="sr-only">Search by song or album name</label>
        <input id="song-q" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" enterKeyHint="search" placeholder="Or search: artist and song name" className="flex-1 min-w-0 bg-transparent text-callout outline-none placeholder:text-smoke/85" />
      </div>
      {hits.length > 0 && (
        <ul className="flex flex-col rounded-2xl bg-ink border border-paper/8 divide-y divide-paper/8">
          {hits.map((h) => (
            <li key={h.url}>
              <button
                type="button"
                onClick={() => {
                  onPick(h);
                  setQ("");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-paper/5"
              >
                <span className="relative size-10 shrink-0 rounded-xs overflow-hidden bg-riser">{h.thumb && <FadeImg src={h.thumb} alt="" className="absolute inset-0 size-full object-cover" />}</span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-subhead font-semibold truncate">{h.title}</span>
                  <span className="text-caption text-smoke truncate">{[h.artist, h.kind, h.year].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-footnote font-semibold text-paper shrink-0">Add</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
