import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";

/**
 * Branded full-screen page for 404s and errors: Ink stage, a warm stage glow and faint
 * record grooves behind a big status line. Server-safe; actions are passed in.
 */
export function StatusPage({
  code,
  title,
  children,
  actions,
}: {
  code: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-ink px-6 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] text-paper">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 45% at 50% 100%, rgb(255 178 69 / 0.28), transparent 70%), radial-gradient(40% 35% at 15% 0%, rgb(255 172 186 / 0.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-full -z-10 aspect-square w-[1400px] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-[spin_120s_linear_infinite]"
        style={{
          background: "repeating-radial-gradient(circle, rgb(245 241 236 / 0.06) 0 1px, transparent 1px 10px)",
        }}
      />
      <Link href="/" className="self-start text-paper" aria-label="Mixstro home">
        <Wordmark size={22} />
      </Link>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-16 text-center">
        <p
          className="font-display leading-none tracking-[-0.06em] text-transparent"
          style={{
            fontSize: "clamp(96px, 26vw, 200px)",
            fontWeight: 700,
            backgroundImage: "linear-gradient(100deg, #F7BF77, #FFB245 45%, #FFACBA)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          {code}
        </p>
        <h1 className="mt-6 font-display text-[clamp(30px,6vw,44px)] font-semibold leading-[1.05] tracking-[-0.035em]">
          {title}
        </h1>
        <div className="mt-4 max-w-[36ch] text-[17px] leading-relaxed text-smoke">{children}</div>
        <div className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:flex-row">{actions}</div>
      </div>
    </main>
  );
}
