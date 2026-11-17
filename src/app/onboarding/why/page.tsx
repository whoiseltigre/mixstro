"use client";

import { useRouter } from "next/navigation";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, cx } from "@/components/ui";
import { useState } from "react";
import { REASONS, STEP_GLOW, saveProfile, useDraft } from "@/lib/onboarding";

/** "What are you here for?", from "Finish your profile" (no longer a signup step). */

export default function Why() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save() {
    setSaving(true);
    const r = await saveProfile(draft);
    setSaving(false);
    if (r.error) return setError(r.error);
    router.push("/me");
  }

  // One tap per reason. "Find bandmates" covers starting, rebuilding and joining a band alike.
  function tapReason(ids: string[]) {
    try {
      navigator.vibrate?.(8);
    } catch {}
    const on = ids.some((id) => draft.goals.includes(id));
    update({ goals: on ? draft.goals.filter((g) => !ids.includes(g)) : [...draft.goals, ...ids] });
  }

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader back="/me" glow={STEP_GLOW.why} />
      <StepTitle eyebrow="Your goals" color={STEP_GLOW.why} title="What are you here for?" sub="Pick any. You can change this later." />
      <div className="px-5 pt-7 flex flex-col gap-3">
        {REASONS.map((r, i) => {
          const ids = r.goals.map((g) => g.id);
          const on = ids.some((id) => draft.goals.includes(id));
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() => tapReason(ids)}
              style={{ "--hue": r.color, animationDelay: `${i * 50}ms` } as React.CSSProperties}
              className={cx(
                "rise-in w-full flex items-center gap-4 p-4 rounded-[22px] border-[1.5px] text-left transition hover:-translate-y-0.5 active:scale-[0.98]",
                on
                  ? "border-[var(--hue)] bg-[color-mix(in_srgb,var(--hue)_14%,var(--color-stage))] shadow-[0_10px_30px_-14px_var(--hue)]"
                  : "border-paper/6 bg-stage hover:border-paper/20",
              )}
            >
              <span
                className={cx(
                  "size-12 rounded-[15px] flex items-center justify-center shrink-0 transition",
                  on ? "bg-[var(--hue)] text-ink" : "bg-[color-mix(in_srgb,var(--hue)_16%,transparent)] text-[var(--hue)]",
                )}
              >
                <ReasonIcon id={r.id} />
              </span>
              <span className="flex-1 flex flex-col gap-0.5">
                <span className="text-[17px] font-medium">{r.title}</span>
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
          );
        })}
      </div>
      <StepFooter>
        {error && (
          <p role="alert" className="text-[13px] text-[#FF453A]">
            {error}
          </p>
        )}
        <Button disabled={!draft.goals.length || saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </StepFooter>
    </main>
  );
}

function ReasonIcon({ id }: { id: string }) {
  const paths: Record<string, React.ReactNode> = {
    // A spotlight on you.
    showcase: (
      <>
        <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
        <path d="M5 21h14" />
      </>
    ),
    // People to play with.
    bandmates: (
      <>
        <circle cx="8.5" cy="8" r="3" />
        <circle cx="16.5" cy="9" r="2.5" />
        <path d="M3 19c.5-3.3 2.7-5 5.5-5s5 1.7 5.5 5M14.5 14.2c.6-.2 1.3-.2 2-.2 2.4 0 4.1 1.5 4.5 4" />
      </>
    ),
    // A ticket for the next show.
    network: (
      <>
        <path d="M4 7h16v3.2a2 2 0 0 0 0 3.6V17H4v-3.2a2 2 0 0 0 0-3.6z" />
        <path d="M14 7v10" strokeDasharray="1.6 2" />
      </>
    ),
  };
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[id]}
    </svg>
  );
}
