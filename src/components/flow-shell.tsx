"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STEP_GLOW, STEPS, type Step } from "@/lib/onboarding";
import { Wordmark } from "./ui";

/**
 * Frame for sign-in and onboarding. Phones get the screen edge to edge; tablets get a centered column;
 * desktops get the flow as a floating card over the step's stage glow, with the wordmark top left.
 */
export function FlowShell({ children }: { children: React.ReactNode }) {
  const step = usePathname().split("/").pop() as Step;
  const glow = STEPS.includes(step) ? STEP_GLOW[step] : "#FFB245";

  return (
    <div className="relative min-h-dvh md:flex md:items-center md:justify-center md:px-8 md:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden md:block transition-[background] duration-500"
        style={{ background: `radial-gradient(60% 55% at 50% 0%, ${glow}33, transparent), radial-gradient(40% 40% at 85% 100%, ${glow}14, transparent)` }}
      />
      <Link href="/" aria-label="Mixstro home" className="hidden md:inline-flex absolute top-8 left-10 z-10">
        <Wordmark size={26} />
      </Link>
      <div className="relative w-full mx-auto md:max-w-[560px] md:rounded-[32px] md:bg-ink md:border md:border-paper/10 md:shadow-[0_40px_120px_-40px_rgb(0_0_0/0.9)] md:overflow-hidden md:[&_main]:min-h-[720px] md:[&>form]:min-h-[720px]">
        {children}
      </div>
    </div>
  );
}
