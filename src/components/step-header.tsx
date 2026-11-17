"use client";

import { useRouter } from "next/navigation";
import { BackButton } from "./ui";

export function StepHeader({ step, total, back, glow }: { step?: number; total?: number; back?: string; glow?: string }) {
  const router = useRouter();
  return (
    <div className="relative pt-safe px-5 flex items-center gap-3.5 h-[calc(max(env(safe-area-inset-top),16px)+48px)]">
      {glow && (
        // Stage spill: a soft wash of the step's color behind the header and title.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[380px] -z-10 opacity-30"
          style={{ background: `radial-gradient(70% 60% at 50% 0%, ${glow}, transparent)` }}
        />
      )}
      {back ? <BackButton href={back} /> : <BackButton onClick={() => router.back()} />}
      {step && total && (
        <>
          <div
            role="progressbar"
            aria-label={`Step ${step} of ${total}`}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step}
            className="flex-1 h-2 rounded-full bg-paper/12 overflow-hidden"
          >
            {/* One bar that fills up, lit in the step's color, like a fader being pushed. */}
            <span
              className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.2,0.9,0.25,1)]"
              style={{
                width: `${(step / total) * 100}%`,
                background: glow ? `linear-gradient(90deg, color-mix(in srgb, ${glow} 55%, #fff0), ${glow})` : "var(--color-paper)",
                boxShadow: glow ? `0 0 12px ${glow}99` : undefined,
              }}
            />
          </div>
          <span className="text-[12px] text-smoke tabular-nums">
            {step} of {total}
          </span>
        </>
      )}
    </div>
  );
}

export function StepTitle({ title, sub, eyebrow, color }: { title: string; sub?: string; eyebrow?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-2 px-6 pt-6">
      {eyebrow && (
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: color ?? "var(--color-tungsten)" }}>
          {eyebrow}
        </span>
      )}
      <h1 className="font-display text-[31px] font-semibold tracking-[-0.03em] leading-[1.05] text-balance">{title}</h1>
      {sub && <p className="text-[15px] leading-[1.45] text-smoke text-pretty">{sub}</p>}
    </div>
  );
}

/** Sticky bottom action area that sits above the home indicator. */
export function StepFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto px-5 pt-8 pb-safe bg-gradient-to-t from-ink from-0% via-ink via-75% to-ink/0 flex flex-col gap-2">
      {children}
    </div>
  );
}
