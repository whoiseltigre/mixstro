"use client";

import { useState } from "react";
import { KindIcon } from "@/components/profile-extras";
import { BackButton, Button, Field, cx } from "@/components/ui";
import { useMyExtras, type HighlightInput } from "@/lib/extras-store";
import { HIGHLIGHTS_MAX, HIGHLIGHT_KINDS, type Highlight, type HighlightKind } from "@/lib/highlights";

const thisYear = new Date().getFullYear();
const blank = (): HighlightInput & { id?: string } => ({ kind: "release", title: "", detail: "", year: thisYear, url: "" });

/** Add and edit your highlights: releases, notable shows, press, awards. */
export default function HighlightsEditor() {
  const { ready, highlights, saveHighlight, removeHighlight } = useMyExtras();
  const [form, setForm] = useState<(HighlightInput & { id?: string }) | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const kind = HIGHLIGHT_KINDS.find((k) => k.id === form?.kind) ?? HIGHLIGHT_KINDS[0];

  async function save() {
    if (!form) return;
    setBusy(true);
    const r = await saveHighlight(form, form.id);
    setBusy(false);
    if (r.error) return setError(r.error);
    setError(undefined);
    setForm(null);
  }

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:max-w-[680px] md:mx-auto">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/me" />
        <h1 className="headline text-[28px]">Highlights</h1>
      </header>
      <p className="text-[15px] text-smoke text-pretty -mt-2">
        The moments you&apos;d want someone to know first: a release, a show you&apos;re proud of, press, an award. Up to {HIGHLIGHTS_MAX}.
      </p>

      {form ? (
        <section className="flex flex-col gap-4 p-4 rounded-[22px] bg-stage border border-paper/8">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kind">
            {HIGHLIGHT_KINDS.map((k) => {
              const on = form.kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setForm({ ...form, kind: k.id as HighlightKind })}
                  className={cx("h-9 px-3.5 rounded-full text-[14px] inline-flex items-center gap-1.5 border transition", on ? "font-semibold" : "border-paper/16 text-paper")}
                  style={on ? { borderColor: k.color, background: `color-mix(in srgb, ${k.color} 18%, transparent)`, color: k.color } : undefined}
                >
                  <KindIcon kind={k.id} />
                  {k.label}
                </button>
              );
            })}
          </div>
          <Field id="h-title" label="What happened" placeholder={kind.example} value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Field id="h-detail" label="A detail (optional)" placeholder="With Night Shift, sold out" value={form.detail ?? ""} maxLength={140} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field
              id="h-year"
              label="Year"
              inputMode="numeric"
              value={form.year ? String(form.year) : ""}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || undefined })}
            />
            <Field id="h-url" label="Link (optional)" placeholder="https://" inputMode="url" autoCapitalize="none" value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-[#FF453A]">
              {error}
            </p>
          )}
          <div className="flex gap-2.5">
            <Button onClick={save} disabled={busy || !form.title.trim()} className="h-12 text-[16px]">
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button variant="glass" onClick={() => (setForm(null), setError(undefined))} className="h-12 text-[16px]">
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        ready &&
        highlights.length < HIGHLIGHTS_MAX && (
          <Button variant="gel" onClick={() => setForm(blank())} className="h-12 text-[16px]">
            Add a highlight
          </Button>
        )
      )}

      {ready && highlights.length > 0 && (
        <ul className="flex flex-col rounded-[22px] bg-stage divide-y divide-paper/8">
          {highlights.map((h) => (
            <Row key={h.id} h={h} onEdit={() => setForm({ ...h })} onRemove={() => removeHighlight(h.id)} />
          ))}
        </ul>
      )}
    </main>
  );
}

function Row({ h, onEdit, onRemove }: { h: Highlight; onEdit: () => void; onRemove: () => void }) {
  const kind = HIGHLIGHT_KINDS.find((k) => k.id === h.kind) ?? HIGHLIGHT_KINDS[4];
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span className="size-10 rounded-2xl shrink-0 flex items-center justify-center" style={{ background: `color-mix(in srgb, ${kind.color} 18%, transparent)`, color: kind.color }} aria-hidden="true">
        <KindIcon kind={h.kind} />
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-pretty">{h.title}</span>
        <span className="text-[13px] text-smoke">{[kind.label, h.detail, h.year].filter(Boolean).join(" · ")}</span>
      </span>
      <button type="button" onClick={onEdit} className="text-[14px] font-semibold underline underline-offset-2">
        Edit
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${h.title}`} className="size-9 rounded-full flex items-center justify-center text-smoke hover:text-paper hover:bg-paper/8">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </li>
  );
}
