"use client";

import { useRouter } from "next/navigation";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, SectionLabel, cx } from "@/components/ui";
import { COMMITMENT, GOALS, stepNav, toggle, useDraft } from "@/lib/onboarding";

const nav = stepNav("goals");

export default function Goals() {
  const router = useRouter();
  const { draft, update } = useDraft();

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} />
      <StepTitle title="What are you after?" sub="Pick any. It shapes who we introduce you to and what your profile shows first." />
      <div className="px-5 pt-7 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          {GOALS.map((g) => {
            const on = draft.goals.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                onClick={() => update({ goals: toggle(draft.goals, g.id) })}
                className={cx(
                  "flex items-center gap-3 px-4 py-3.5 rounded-[18px] bg-stage text-left border transition",
                  on ? "border-paper/70" : "border-paper/8",
                )}
              >
                <span className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[16px] font-semibold">{g.title}</span>
                  <span className="text-[13px] text-smoke">{g.sub}</span>
                </span>
                <span
                  className={cx(
                    "size-6 rounded-full flex items-center justify-center shrink-0",
                    on ? "bg-paper text-ink" : "border-[1.5px] border-paper/25",
                  )}
                >
                  {on && <CheckIcon size={13} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>How serious are you right now?</SectionLabel>
          <input
            type="range"
            min={0}
            max={COMMITMENT.length - 1}
            step={1}
            value={draft.commitment}
            onChange={(e) => update({ commitment: Number(e.target.value) })}
            aria-valuetext={COMMITMENT[draft.commitment]}
            className="w-full accent-paper"
          />
          <div className="flex justify-between text-[12px]">
            {COMMITMENT.map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ commitment: i })}
                className={i === draft.commitment ? "font-semibold text-paper" : "text-smoke"}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <StepFooter>
        <Button disabled={draft.goals.length === 0} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}
