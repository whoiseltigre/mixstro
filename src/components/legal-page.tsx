import type { ReactNode } from "react";
import { BackButton, Wordmark } from "@/components/ui";

/** Shared shell for the Privacy Policy and Terms pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="pt-safe pb-safe px-5 mx-auto w-full max-w-[680px]">
      <div className="flex items-center justify-between py-2">
        <BackButton href="/" />
        <Wordmark size={18} />
        <span className="size-10" />
      </div>
      <h1 className="headline mt-8 text-display" style={{ fontWeight: 700 }}>
        {title}
      </h1>
      <p className="mt-2 text-footnote text-smoke">Last updated {updated}</p>
      <div className="mt-8 flex flex-col gap-6 text-callout leading-[1.55] text-paper/85 [&_h2]:mb-1.5 [&_h2]:text-body-lg [&_h2]:font-semibold [&_h2]:text-paper">
        {children}
      </div>
    </main>
  );
}
