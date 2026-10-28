"use client";

import { useRouter } from "next/navigation";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, Chip, SectionLabel, cx } from "@/components/ui";
import { GENRES, INSTRUMENTS, type Level, stepNav, toggle, useDraft } from "@/lib/onboarding";

const nav = stepNav("instruments");
const LEVELS: { id: Level; label: string }[] = [
  { id: "learning", label: "Learning" },
  { id: "solid", label: "Solid" },
  { id: "pro", label: "Pro" },
];

export default function Instruments() {
  const router = useRouter();
  const { draft, update } = useDraft();

  function tapInstrument(name: string) {
    const on = draft.instruments.includes(name);
    // First tap selects, second tap makes it your main, third tap removes.
    if (on && draft.mainInstrument !== name) return update({ mainInstrument: name });
    const instruments = toggle(draft.instruments, name);
    update({
      instruments,
      mainInstrument: on ? (draft.mainInstrument === name ? instruments[0] : draft.mainInstrument) : (draft.mainInstrument ?? name),
    });
  }

  const ok = draft.instruments.length > 0 && draft.level && draft.genres.length > 0;

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} />
      <StepTitle title="What do you play?" sub="Pick everything. Tap again to mark your main one." />
      <div className="px-5 pt-7 flex flex-col gap-7">
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.map((name) => (
            <Chip key={name} selected={draft.instruments.includes(name)} onClick={() => tapInstrument(name)}>
              {name}
              {draft.mainInstrument === name && <span className="ml-1 text-[11px] font-bold text-ink/60">MAIN</span>}
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <SectionLabel>Your level</SectionLabel>
          <div role="radiogroup" aria-label="Your level" className="flex gap-1 p-1 rounded-2xl bg-stage">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={draft.level === l.id}
                onClick={() => update({ level: l.id })}
                className={cx(
                  "flex-1 h-10 rounded-xl text-[15px] transition",
                  draft.level === l.id ? "bg-riser font-semibold shadow-[inset_0_1px_0_rgb(245_241_236/0.12)]" : "text-smoke",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <SectionLabel>Main genres</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <Chip key={g} selected={draft.genres.includes(g)} onClick={() => update({ genres: toggle(draft.genres, g) })} className="h-9 px-3.5 text-[14px]">
                {g}
              </Chip>
            ))}
          </div>
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
