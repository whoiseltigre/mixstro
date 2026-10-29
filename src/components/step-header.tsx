"use client";

import { useRouter } from "next/navigation";
import { BackButton } from "./ui";

export function StepHeader({ step, total, back }: { step?: number; total?: number; back?: string }) {
  const router = useRouter();
  return (
    <div className="pt-safe px-5 flex items-center gap-3.5 h-[calc(max(env(safe-area-inset-top),16px)+48px)]">
      {back ? <BackButton href={back} /> : <BackButton onClick={() => router.back()} />}
      {step && total && (
        <>
          <div
            role="progressbar"
            aria-label={`Step ${step} of ${total}`}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step}
            className="flex-1 flex gap-1"
          >
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-paper" : "bg-paper/15"}`} />
            ))}
          </div>
          <span className="text-[12px] text-smoke tabular-nums">
            {step}/{total}
          </span>
        </>
      )}
    </div>
  );
}

export function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-2 px-6 pt-6">
      <h1 className="headline text-[32px]">{title}</h1>
      {sub && <p className="text-[15px] leading-[1.45] text-smoke text-pretty">{sub}</p>}
    </div>
  );
}

/** Sticky bottom action area that sits above the home indicator. */
export function StepFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto px-5 pt-4 pb-safe bg-gradient-to-t from-ink via-ink to-ink/0 flex flex-col gap-2">
      {children}
    </div>
  );
}
