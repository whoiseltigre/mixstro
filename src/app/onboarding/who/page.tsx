"use client";

import { useRouter } from "next/navigation";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, cx } from "@/components/ui";
import { type Draft, STEP_GLOW, stepNav, useDraft } from "@/lib/onboarding";

/** The first question: just you, or you and your band. Band signups get a band step and a band page. */
const CHOICES: { id: NonNullable<Draft["signupAs"]>; title: string; sub: string; hue: string; icon: React.ReactNode }[] = [
  {
    id: "solo",
    title: "Just me",
    sub: "Show off your music, find people to play with, land gigs.",
    hue: "#FFB245",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 20c.7-3.9 3.6-6 7.5-6s6.8 2.1 7.5 6" />
      </>
    ),
  },
  {
    id: "band",
    title: "Me and my band",
    sub: "Your profile plus a page for the band, with its music and members.",
    hue: "#FFACBA",
    icon: (
      <>
        <circle cx="8" cy="8.5" r="3" />
        <circle cx="16.5" cy="8" r="2.6" />
        <path d="M2.5 19.5c.5-3.4 2.6-5.3 5.5-5.3s5 1.9 5.5 5.3M14.6 14c.6-.2 1.2-.2 1.9-.2 2.6 0 4.4 1.7 4.9 4.6" />
      </>
    ),
  },
];

export default function Who() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const nav = stepNav("who", draft);

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={STEP_GLOW.who} />
      <StepTitle eyebrow="Welcome" color={STEP_GLOW.who} title="Who's joining Mixstro?" sub="Bands are run by their members, so everyone gets their own profile. We'll set up the band page with you." />
      <div className="px-5 pt-7 flex flex-col gap-3">
        {CHOICES.map((c, i) => {
          const on = draft.signupAs === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                try {
                  navigator.vibrate?.(8);
                } catch {}
                // Switching to "Just me" drops a band started on the band step.
                update(c.id === "solo" ? { signupAs: c.id, band: undefined } : { signupAs: c.id });
              }}
              style={{ "--hue": c.hue, animationDelay: `${i * 60}ms` } as React.CSSProperties}
              className={cx(
                "rise-in w-full flex items-center gap-4 p-5 rounded-[24px] border-[1.5px] text-left transition hover:-translate-y-0.5 active:scale-[0.98]",
                on
                  ? "border-[var(--hue)] bg-[color-mix(in_srgb,var(--hue)_14%,var(--color-stage))] shadow-[0_12px_34px_-14px_var(--hue)]"
                  : "border-paper/6 bg-stage hover:border-paper/20",
              )}
            >
              <span
                className={cx(
                  "size-14 rounded-[17px] flex items-center justify-center shrink-0 transition",
                  on ? "bg-[var(--hue)] text-ink" : "bg-[color-mix(in_srgb,var(--hue)_16%,transparent)] text-[var(--hue)]",
                )}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {c.icon}
                </svg>
              </span>
              <span className="flex-1 flex flex-col gap-1">
                <span className="text-[18px] font-medium">{c.title}</span>
                <span className="text-[13.5px] leading-snug text-smoke text-pretty">{c.sub}</span>
              </span>
              <span className={cx("size-6 rounded-full flex items-center justify-center shrink-0 transition", on ? "bg-[var(--hue)] text-ink" : "border-[1.5px] border-paper/25")}>
                {on && <CheckIcon size={13} />}
              </span>
            </button>
          );
        })}
      </div>
      <StepFooter>
        <Button disabled={!draft.signupAs} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}
