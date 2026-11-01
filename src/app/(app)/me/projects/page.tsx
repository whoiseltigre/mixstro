"use client";

import { useState } from "react";
import { ProjectList } from "@/components/project-list";
import { BackButton, Button, Field } from "@/components/ui";
import { PROVIDER_LABEL, parseClip } from "@/lib/clips";
import { NAME_MAX, ROLE_MAX, TRACKS_MAX, YEARS, thisYear, type Project, type Track } from "@/lib/projects";
import { useMyProjects } from "@/lib/projects-store";
import { lookupTrack } from "./actions";

type Form = { id?: string; name: string; role: string; startYear: number; endYear: number; current: boolean; tracks: Track[] };

const blank = (): Form => ({ name: "", role: "", startYear: thisYear(), endYear: thisYear(), current: true, tracks: [] });
const fromProject = (p: Project): Form => ({
  id: p.id,
  name: p.name,
  role: p.role ?? "",
  startYear: p.startYear,
  endYear: p.endYear ?? thisYear(),
  current: p.endYear === undefined,
  tracks: p.tracks,
});

const selectCls = "h-[50px] w-full rounded-2xl bg-ink border border-paper/12 px-3.5 text-[16px] text-paper outline-none focus:border-paper/50";

export default function ProjectsEditor() {
  const { projects, ready, save, remove } = useMyProjects();
  const [form, setForm] = useState<Form | null>(null);

  return (
    <main className="pt-safe px-5 pb-32 flex flex-col gap-6">
      <div className="mt-2 flex flex-col gap-5">
        <BackButton href="/me" />
        <div className="flex flex-col gap-2">
          <h1 className="text-[34px] font-bold tracking-[-0.03em] leading-tight">Your projects</h1>
          <p className="text-[15px] text-smoke leading-snug">Every band and project, old or new. Add the name, your role and the years, then link a track or two.</p>
        </div>
        <Button onClick={() => setForm(blank())} className="h-12 text-[16px]">
          Add a project
        </Button>
      </div>

      {ready && projects.length > 0 && <ProjectList projects={projects} onEdit={(p) => setForm(fromProject(p))} />}

      {form && (
        <ProjectSheet
          form={form}
          update={(fn) => setForm((f) => f && fn(f))}
          onClose={() => setForm(null)}
          onSave={async () => {
            const res = await save(
              { name: form.name, role: form.role, startYear: form.startYear, endYear: form.current ? undefined : form.endYear, tracks: form.tracks },
              form.id,
            );
            if (!res.error) setForm(null);
            return res;
          }}
          onRemove={
            form.id
              ? async () => {
                  const res = await remove(form.id!);
                  if (!res.error) setForm(null);
                  return res;
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

  async function addTrack(raw: string) {
    const clip = parseClip(raw);
    if (!clip) return setError("That link isn't one we can play yet. Try YouTube, SoundCloud, Spotify or Apple Music.");
    if (form.tracks.some((t) => t.url && parseClip(t.url)?.id === clip.id)) return setError("You already added that one.");
    setError(undefined);
    setLink("");
    const id = crypto.randomUUID();
    update((f) => ({ ...f, tracks: [...f.tracks, { id, provider: clip.provider, url: clip.url, thumb: clip.thumb }] }));
    const info = await lookupTrack(clip.url).catch(() => ({ title: undefined, thumb: undefined }));
    // Fill in what the platform knows without overwriting a title typed meanwhile.
    update((f) => ({ ...f, tracks: f.tracks.map((t) => (t.id === id ? { ...t, title: t.title || info.title, thumb: info.thumb ?? t.thumb } : t)) }));
  }

  async function run(action: () => Promise<{ error?: string }>) {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (res.error) setError(res.error);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          run(onSave);
        }}
        aria-label={form.id ? "Edit project" : "Add a project"}
        className="w-full max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-t-[32px] bg-stage border-t border-paper/12 shadow-[0_-20px_60px_rgb(0_0_0/0.5)] px-5 pt-2.5 pb-safe flex flex-col gap-4"
      >
        <span aria-hidden="true" className="self-center w-[38px] h-[5px] rounded-full bg-paper/25" />
        <div className="flex justify-between items-center">
          <button type="button" onClick={onClose} className="text-[16px] text-smoke">
            Cancel
          </button>
          <h2 className="text-[17px] font-bold">{form.id ? "Edit project" : "Add a project"}</h2>
          <button type="submit" disabled={busy || !form.name.trim()} className="text-[16px] font-semibold disabled:opacity-40">
            Save
          </button>
        </div>

        <Field id="project-name" label="Band or project" value={form.name} maxLength={NAME_MAX} onChange={(e) => set({ name: e.target.value })} placeholder="Night Shift" required className="text-[16px] bg-ink" />
        <Field id="project-role" label="Your role" value={form.role} maxLength={ROLE_MAX} onChange={(e) => set({ role: e.target.value })} placeholder="Bass, vocals, producer" className="text-[16px] bg-ink" />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-2">
            <label htmlFor="project-from" className="text-[13px] font-semibold text-smoke">From</label>
            <select id="project-from" value={form.startYear} onChange={(e) => set({ startYear: Number(e.target.value) })} className={selectCls}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="project-to" className="text-[13px] font-semibold text-smoke">To</label>
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
        <button
          type="button"
          role="switch"
          aria-checked={form.current}
          onClick={() => set({ current: !form.current, endYear: Math.max(form.endYear, form.startYear) })}
          className="flex justify-between items-center text-[15px]"
        >
          I still play with them
          <span className={`relative w-[50px] h-[30px] rounded-full transition-colors ${form.current ? "bg-[#67E2DA]" : "bg-paper/20"}`}>
            <span className={`absolute top-[3px] size-6 rounded-full bg-paper transition-[left] duration-150 ${form.current ? "left-[23px]" : "left-[3px]"}`} />
          </span>
        </button>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-smoke">Tracks</span>
          {form.tracks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-2xl bg-ink border border-paper/8">
              <span className="relative size-10 shrink-0 rounded-[10px] overflow-hidden bg-riser">
                {t.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumb} alt="" className="absolute inset-0 size-full object-cover" />
                )}
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <input
                  aria-label="Track title"
                  value={t.title ?? ""}
                  maxLength={120}
                  onChange={(e) => update((f) => ({ ...f, tracks: f.tracks.map((x) => (x.id === t.id ? { ...x, title: e.target.value } : x)) }))}
                  placeholder="Track title"
                  className="bg-transparent text-[14px] font-semibold outline-none placeholder:text-smoke/60"
                />
                <span className="text-[12px] text-smoke">{PROVIDER_LABEL[t.provider]}</span>
              </span>
              <button
                type="button"
                onClick={() => update((f) => ({ ...f, tracks: f.tracks.filter((x) => x.id !== t.id) }))}
                aria-label={`Remove ${t.title || "track"}`}
                className="size-8 rounded-full flex items-center justify-center text-smoke hover:text-paper"
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
                  if (parseClip(text)) {
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
                className="flex-1 min-w-0 bg-transparent text-[15px] outline-none placeholder:text-smoke/60"
              />
              <button type="button" onClick={() => addTrack(link)} disabled={!link.trim()} className="h-[38px] px-3.5 rounded-full bg-paper text-ink text-[14px] font-semibold disabled:opacity-40">
                Add
              </button>
            </div>
          )}
          <span className="text-[12px] text-smoke text-center">YouTube · SoundCloud · Spotify · Apple Music</span>
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-[#FF453A]">
            {error}
          </p>
        )}
        {onRemove && (
          <button type="button" onClick={() => run(onRemove)} disabled={busy} className="self-center text-[14px] font-semibold text-[#FF453A] disabled:opacity-40 pb-2">
            Remove project
          </button>
        )}
      </form>
    </div>
  );
}
