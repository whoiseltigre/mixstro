"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InstrumentIcon } from "@/components/instrument-icon";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, cx } from "@/components/ui";
import { FAMILIES, type Family, familyOf, headlineFor } from "@/lib/instruments";
import { STEP_GLOW, stepNav, toggle, useDraft, type Draft } from "@/lib/onboarding";


/** A tiny tap you can feel on phones that support it. */
const tick = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

export default function Play() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const nav = stepNav("play", draft);
  const [open, setOpen] = useState<Family>();
  const [popped, setPopped] = useState<string>();

  const familyFor = (name: string) => familyOf(name)?.id ?? draft.customFamily?.[name];
  const pickedIn = (f: Family) => draft.instruments.filter((i) => familyFor(i) === f.id);

  function setInstruments(instruments: string[], customFamily = draft.customFamily) {
    const main = draft.mainInstrument && instruments.includes(draft.mainInstrument) ? draft.mainInstrument : instruments[0];
    update({ instruments, mainInstrument: main, customFamily });
  }

  function closeSheet(f: Family) {
    setOpen(undefined);
    if (pickedIn(f).length) {
      setPopped(f.id);
      setTimeout(() => setPopped(undefined), 400);
    }
  }

  const headline = headlineFor(draft.instruments, draft.mainInstrument);

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={STEP_GLOW.play} />
      <StepTitle eyebrow="Your sound" color={STEP_GLOW.play} title="What do you play?" sub="Tap a family, then pick exactly what you play. Pick as many as you like." />
      <div className="px-5 pt-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-2.5">
          {FAMILIES.map((f, i) => {
            const picks = pickedIn(f);
            const on = picks.length > 0;
            return (
              <button
                key={f.id}
                type="button"
                aria-haspopup="dialog"
                aria-label={`${f.label}${on ? `: ${picks.join(", ")}` : ""}`}
                onClick={() => {
                  tick();
                  setOpen(f);
                }}
                style={{ "--hue": f.hue, animationDelay: `${i * 25}ms` } as React.CSSProperties}
                className={cx(
                  "rise-in relative min-h-[96px] p-3.5 rounded-[22px] flex flex-col items-start justify-between gap-3 text-left border-[1.5px] transition hover:-translate-y-0.5 active:scale-[0.98]",
                  on
                    ? "border-[var(--hue)] bg-[color-mix(in_srgb,var(--hue)_16%,var(--color-stage))] shadow-[0_10px_30px_-12px_var(--hue)]"
                    : "border-paper/6 bg-stage hover:border-paper/20",
                  popped === f.id && "pick-pop",
                )}
              >
                <span className="flex w-full items-start justify-between">
                  <span
                    className={cx(
                      "size-11 rounded-[14px] flex items-center justify-center transition",
                      on ? "bg-[var(--hue)] text-ink" : "bg-[color-mix(in_srgb,var(--hue)_16%,transparent)] text-[var(--hue)]",
                    )}
                  >
                    <InstrumentIcon family={f.id} />
                  </span>
                  {on && (
                    <span className="h-6 min-w-6 px-1.5 rounded-full bg-[var(--hue)] text-ink text-[12px] font-semibold flex items-center justify-center tabular-nums">
                      {picks.length}
                    </span>
                  )}
                </span>
                <span className="flex flex-col gap-0.5 w-full min-w-0">
                  <span className="text-[16px] font-medium leading-tight">{f.label}</span>
                  <span className={cx("text-[12.5px] leading-snug truncate", on ? "text-[var(--hue)]" : "text-smoke")}>
                    {on ? picks.join(", ") : f.peek}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {draft.instruments.length > 1 && (
          <div className="flex flex-col gap-2.5 rise-in" role="radiogroup" aria-label="Your main instrument">
            <span className="text-[13px] font-medium text-smoke">Which one do you play most?</span>
            <div className="flex flex-wrap gap-2">
              {draft.instruments.map((name) => {
                const on = draft.mainInstrument === name;
                const hue = FAMILIES.find((f) => f.id === familyFor(name))?.hue ?? "#FFB245";
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      tick();
                      update({ mainInstrument: name });
                    }}
                    style={{ "--hue": hue } as React.CSSProperties}
                    className={cx(
                      "h-9 px-3.5 rounded-full text-[14px] inline-flex items-center gap-1.5 border transition active:scale-[0.97]",
                      on ? "bg-[var(--hue)] text-ink border-[var(--hue)] font-medium" : "border-paper/16 text-paper",
                    )}
                  >
                    {on && <StarIcon />}
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <StepFooter>
        {headline && (
          <div className="rise-in self-center glass rounded-full pl-1.5 pr-4 h-10 flex items-center gap-2.5 text-[14px] mb-1" key={headline}>
            <span className="size-7 rounded-full overflow-hidden bg-riser shrink-0">
              {draft.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
              )}
            </span>
            <span className="text-smoke truncate">
              <span className="text-paper font-medium">{draft.firstName || "You"}</span> · {headline}
            </span>
          </div>
        )}
        <Button disabled={!draft.instruments.length} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>

      {open && (
        <FamilySheet
          family={open}
          draft={draft}
          picks={pickedIn(open)}
          onToggle={(name) => {
            tick();
            setInstruments(toggle(draft.instruments, name));
          }}
          onAdd={(name) => {
            tick();
            if (draft.instruments.some((i) => i.toLowerCase() === name.toLowerCase())) return;
            setInstruments([...draft.instruments, name], { ...draft.customFamily, [name]: open.id });
          }}
          onClose={() => closeSheet(open)}
        />
      )}
    </main>
  );
}

/** The family's exact instruments, in a glass sheet that rises from the bottom (a centered card on desktop). */
function FamilySheet({
  family: f,
  draft,
  picks,
  onToggle,
  onAdd,
  onClose,
}: {
  family: Family;
  draft: Draft;
  picks: string[];
  onToggle: (name: string) => void;
  onAdd: (name: string) => void;
  onClose: () => void;
}) {
  const [other, setOther] = useState("");
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Anything you added yourself (or an older, broader pick like "Strings") shows as a chip too.
  const extras = picks.filter((p) => !f.options.includes(p));
  const options = [...f.options, ...extras];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    if (typing) inputRef.current?.focus();
  }, [typing]);

  function addOther() {
    const name = other.trim().replace(/\s+/g, " ");
    if (name.length > 1) onAdd(name[0].toUpperCase() + name.slice(1));
    setOther("");
    setTyping(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button type="button" aria-label="Close" onClick={onClose} className="sheet-scrim absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div
        style={{ "--hue": f.hue } as React.CSSProperties}
        className="sheet-up relative w-full md:max-w-[480px] glass !bg-[rgb(26_24_22/0.82)] rounded-t-[30px] md:rounded-[30px] px-5 pt-3 pb-safe md:pb-6 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.8)] overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-35"
          style={{ background: `radial-gradient(70% 100% at 50% 0%, ${f.hue}, transparent)` }}
        />
        <div className="relative mx-auto mb-4 h-1.5 w-10 rounded-full bg-paper/25 md:hidden" />
        <div className="relative flex items-center gap-3.5">
          <span className="size-12 rounded-[15px] bg-[var(--hue)] text-ink flex items-center justify-center shrink-0">
            <InstrumentIcon family={f.id} size={30} />
          </span>
          <span className="flex flex-col">
            <h2 id="sheet-title" className="font-display text-[22px] font-semibold tracking-[-0.02em]">
              {f.label}
            </h2>
            <span className="text-[13px] text-smoke">{picks.length ? `${picks.length} picked` : "Pick everything you play"}</span>
          </span>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2">
          {options.map((name, i) => {
            const on = draft.instruments.includes(name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(name)}
                style={{ animationDelay: `${60 + i * 30}ms` }}
                className={cx(
                  "rise-in h-11 px-4 rounded-full text-[15px] inline-flex items-center gap-1.5 border-[1.5px] transition active:scale-[0.96]",
                  on ? "bg-[var(--hue)] text-ink border-[var(--hue)] font-medium" : "border-paper/18 text-paper hover:border-paper/40",
                )}
              >
                {on && <CheckIcon size={13} />}
                {name}
              </button>
            );
          })}
          {typing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addOther();
              }}
              className="h-11 pl-4 pr-1.5 rounded-full border-[1.5px] border-[var(--hue)] inline-flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={other}
                onChange={(e) => setOther(e.target.value)}
                onBlur={() => (other.trim() ? addOther() : setTyping(false))}
                placeholder="What else?"
                maxLength={30}
                aria-label={`Another ${f.label.toLowerCase()} instrument`}
                className="w-32 bg-transparent text-[15px] outline-none placeholder:text-smoke"
              />
              <button type="submit" className="h-8 px-3 rounded-full bg-[var(--hue)] text-ink text-[13px] font-medium">
                Add
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setTyping(true)}
              className="rise-in h-11 px-4 rounded-full text-[15px] inline-flex items-center gap-1.5 border-[1.5px] border-dashed border-paper/25 text-smoke hover:text-paper"
              style={{ animationDelay: `${60 + options.length * 30}ms` }}
            >
              <span aria-hidden="true">+</span> Something else
            </button>
          )}
        </div>

        <div className="relative mt-6">
          <Button onClick={onClose}>{picks.length ? "Done" : "Close"}</Button>
        </div>
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}
