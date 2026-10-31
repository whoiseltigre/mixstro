"use client";

import { useRouter } from "next/navigation";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, SectionLabel, cx } from "@/components/ui";
import { INSTRUMENTS, STEP_GLOW, stepNav, toggle, useDraft } from "@/lib/onboarding";

const nav = stepNav("play");
// Gel hues, cycled so neighbouring tiles never share a color.
const HUES = ["#FFB245", "#B5C5FF", "#FFACBA", "#67E2DA", "#F7BF77"];

export default function Play() {
  const router = useRouter();
  const { draft, update } = useDraft();

  // A tap only adds or removes. Your first pick is your main until you choose another below.
  function tapInstrument(name: string) {
    const instruments = toggle(draft.instruments, name);
    const main = draft.mainInstrument && instruments.includes(draft.mainInstrument) ? draft.mainInstrument : instruments[0];
    update({ instruments, mainInstrument: main });
  }

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={STEP_GLOW.play} />
      <StepTitle title="What do you play?" sub="Pick everything you play. The star marks your main." />
      <div className="px-5 pt-7 flex flex-col gap-7">
        <div className="grid grid-cols-2 gap-2.5">
          {INSTRUMENTS.map((name, i) => {
            const on = draft.instruments.includes(name);
            const hue = HUES[i % HUES.length];
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => tapInstrument(name)}
                style={{ "--hue": hue } as React.CSSProperties}
                className={cx(
                  "h-[60px] px-3.5 rounded-[18px] flex items-center gap-3 text-left border-[1.5px] transition active:scale-[0.98]",
                  on
                    ? "border-[var(--hue)] bg-[color-mix(in_srgb,var(--hue)_18%,var(--color-stage))] font-semibold"
                    : "border-transparent bg-stage hover:border-paper/20",
                )}
              >
                <span
                  className={cx(
                    "size-7 rounded-[9px] flex items-center justify-center shrink-0 transition",
                    on ? "bg-[var(--hue)] text-ink" : "bg-[color-mix(in_srgb,var(--hue)_20%,transparent)]",
                  )}
                >
                  {on && <CheckIcon size={13} />}
                </span>
                <span className="flex-1 min-w-0 truncate text-[16px]">{name}</span>
                {on && draft.mainInstrument === name && (
                  <span className="text-tungsten" aria-label="Main">
                    <StarIcon />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {draft.instruments.length > 1 && (
          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Your main instrument">
            <SectionLabel>Which one is your main?</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {draft.instruments.map((name) => {
                const on = draft.mainInstrument === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => update({ mainInstrument: name })}
                    className={cx(
                      "h-9 px-3.5 rounded-full text-[14px] inline-flex items-center gap-1.5 border transition active:scale-[0.97]",
                      on ? "bg-tungsten text-ink border-tungsten font-semibold" : "border-paper/16 text-paper",
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
        <Button disabled={!draft.instruments.length} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}
