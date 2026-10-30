"use client";

import { useRouter } from "next/navigation";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, cx } from "@/components/ui";
import { REASONS, STEP_GLOW, stepNav, toggle, useDraft } from "@/lib/onboarding";

const nav = stepNav("why");

export default function Why() {
  const router = useRouter();
  const { draft, update } = useDraft();

  // Turning a reason on picks all of its goals; the chips underneath narrow it down.
  function tapReason(ids: string[]) {
    const on = ids.some((id) => draft.goals.includes(id));
    update({ goals: on ? draft.goals.filter((g) => !ids.includes(g)) : [...draft.goals, ...ids] });
  }

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={STEP_GLOW.why} />
      <StepTitle title="What are you here for?" sub="Pick any. You can change this later." />
      <div className="px-5 pt-7 flex flex-col gap-3">
        {REASONS.map((r) => {
          const ids = r.goals.map((g) => g.id);
          const on = ids.some((id) => draft.goals.includes(id));
          const chips = r.goals.filter((g) => g.label);
          return (
            <div
              key={r.id}
              style={{ "--hue": r.color } as React.CSSProperties}
              className={cx(
                "rounded-[22px] border-[1.5px] transition",
                on ? "border-[var(--hue)] bg-[color-mix(in_srgb,var(--hue)_14%,var(--color-stage))]" : "border-transparent bg-stage",
              )}
            >
              <button type="button" aria-pressed={on} onClick={() => tapReason(ids)} className="w-full flex items-center gap-3 px-4 py-4 text-left">
                <span className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[17px] font-semibold">{r.title}</span>
                  <span className="text-[13px] text-smoke">{r.sub}</span>
                </span>
                <span
                  className={cx(
                    "size-6 rounded-full flex items-center justify-center shrink-0 transition",
                    on ? "bg-[var(--hue)] text-ink" : "border-[1.5px] border-paper/25",
                  )}
                >
                  {on && <CheckIcon size={13} />}
                </span>
              </button>
              {on && chips.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-4 -mt-1">
                  {chips.map((g) => {
                    const picked = draft.goals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        aria-pressed={picked}
                        onClick={() => update({ goals: toggle(draft.goals, g.id) })}
                        className={cx(
                          "h-9 px-3.5 rounded-full text-[14px] border transition active:scale-[0.97]",
                          picked ? "bg-paper text-ink border-paper font-semibold" : "border-paper/20 text-paper",
                        )}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <StepFooter>
        <Button disabled={!draft.goals.length} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}
