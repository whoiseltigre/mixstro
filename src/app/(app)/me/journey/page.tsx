"use client";

import { useRef, useState } from "react";
import { JourneyTimeline } from "@/components/journey-timeline";
import { BackButton, Button, Field } from "@/components/ui";
import { parseClip } from "@/lib/clips";
import { FIRST_YEAR, NOTE_MAX, TITLE_MAX, thisYear, type JourneyEntry } from "@/lib/journey";
import { useMyJourney } from "@/lib/journey-store";
import { lookupTrack } from "./actions";

type Form = { url: string; year: number; title: string; thumb?: string; note: string };

const blank = (year = thisYear()): Form => ({ url: "", year, title: "", note: "" });
const YEARS = Array.from({ length: thisYear() - FIRST_YEAR + 1 }, (_, i) => thisYear() - i);

export default function JourneyEditor() {
  const { entries, ready, save, remove } = useMyJourney();
  const [form, setForm] = useState<Form>(blank());
  const [editing, setEditing] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [looking, setLooking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function fill(url: string) {
    if (!parseClip(url)) return;
    setLooking(true);
    const info = await lookupTrack(url).catch(() => ({ title: undefined, thumb: undefined }));
    setLooking(false);
    // Don't overwrite anything the person already typed.
    setForm((f) => (f.url !== url ? f : { ...f, title: f.title || info.title || "", thumb: info.thumb ?? f.thumb }));
  }

  function startEdit(e: JourneyEntry) {
    setEditing(e.id);
    setError(undefined);
    setForm({ url: e.url ?? "", year: e.year, title: e.title ?? "", thumb: e.thumb, note: e.note ?? "" });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset(year = form.year) {
    setEditing(undefined);
    setError(undefined);
    setForm(blank(year));
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    const res = await save({ url: form.url, year: form.year, title: form.title, thumb: form.thumb, note: form.note }, editing);
    setBusy(false);
    if (res.error) return setError(res.error);
    // Keep the year: people tend to add a few tracks from the same stretch.
    reset(form.year);
  }

  async function onRemove() {
    if (!editing) return;
    setBusy(true);
    const res = await remove(editing);
    setBusy(false);
    if (res.error) return setError(res.error);
    reset();
  }

  return (
    <main className="pt-safe px-5 pb-32 flex flex-col gap-7">
      <div className="mt-2 flex flex-col gap-5">
        <BackButton href="/me" />
        <div className="flex flex-col gap-2">
          <h1 className="headline text-[34px]">Your journey</h1>
          <p className="text-[15px] text-smoke leading-snug">
            Every era counts: the first demo, the band that broke up, the record you&apos;re proudest of. Add a track, pick the year, and say a line about it.
          </p>
        </div>
      </div>

      <form ref={formRef} onSubmit={submit} className="scroll-mt-6 flex flex-col gap-4 p-4 rounded-[24px] bg-stage border border-paper/8">
        <h2 className="text-[17px] font-semibold">{editing ? "Edit track" : "Add a track"}</h2>
        <Field
          id="journey-link"
          label="Link"
          hint={looking ? "Looking it up..." : "YouTube, SoundCloud, Spotify, Apple Music, TikTok or Instagram"}
          value={form.url}
          onChange={(e) => {
            const url = e.target.value;
            setForm((f) => ({ ...f, url, thumb: parseClip(url)?.thumb }));
            setError(undefined);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").trim();
            if (parseClip(text)) {
              e.preventDefault();
              setForm((f) => ({ ...f, url: text, thumb: parseClip(text)?.thumb }));
              fill(text);
            }
          }}
          onBlur={() => fill(form.url)}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Paste a link"
          required
          className="text-[16px] bg-ink"
        />
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5">
          <div className="flex flex-col gap-2">
            <label htmlFor="journey-year" className="text-[13px] font-semibold text-smoke">
              Year
            </label>
            <select
              id="journey-year"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
              className="h-[52px] rounded-2xl bg-ink border border-paper/12 px-3.5 text-[16px] text-paper outline-none focus:border-paper/50"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <Field
            id="journey-title"
            label="Title"
            value={form.title}
            maxLength={TITLE_MAX}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Song, set or band"
            className="text-[16px] bg-ink w-full min-w-0"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <label htmlFor="journey-note" className="text-[13px] font-semibold text-smoke">
              The story
            </label>
            <span className="text-[12px] text-smoke tabular-nums">
              {form.note.length}/{NOTE_MAX}
            </span>
          </div>
          <textarea
            id="journey-note"
            value={form.note}
            maxLength={NOTE_MAX}
            rows={3}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Where you were, who you played with, why it matters"
            className="rounded-2xl bg-ink border border-paper/12 px-4 py-3 text-[16px] leading-snug text-paper placeholder:text-smoke/60 outline-none focus:border-paper/50 resize-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-[13px] text-[#FF453A]">
            {error}
          </p>
        )}
        <div className="flex gap-2.5">
          {editing && (
            <Button type="button" variant="glass" onClick={() => reset()} disabled={busy} className="h-12 text-[16px]">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={busy || !form.url.trim()} className="h-12 text-[16px]">
            {editing ? "Save" : "Add to journey"}
          </Button>
        </div>
        {editing && (
          <button type="button" onClick={onRemove} disabled={busy} className="self-center text-[14px] font-semibold text-[#FF453A] disabled:opacity-40">
            Remove from journey
          </button>
        )}
      </form>

      {ready && (
        <JourneyTimeline
          entries={entries}
          onEdit={startEdit}
          empty={<p className="text-[14px] text-smoke">Nothing here yet. Start with the oldest track you still love.</p>}
        />
      )}
    </main>
  );
}
