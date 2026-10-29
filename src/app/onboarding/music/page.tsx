"use client";

import { useRouter } from "next/navigation";
import { StepHeader, StepTitle } from "@/components/step-header";
import { ChevronRight } from "@/components/ui";
import { DEMO_TOP_ARTISTS } from "@/lib/artists";
import { type MusicSource, useDraft } from "@/lib/onboarding";

// Part of "finish your profile", reached from the Profile tab after onboarding.
const nav = { back: "/me", next: "/onboarding/influences" };

const SOURCES: { id: MusicSource; title: string; sub: string }[] = [
  { id: "apple_music", title: "Apple Music", sub: "Recommended · your top artists and library" },
  { id: "spotify", title: "Spotify", sub: "Your top artists" },
  { id: "manual", title: "Pick artists myself", sub: "Search and add up to 10" },
];

export default function ConnectMusic() {
  const router = useRouter();
  const { draft, update } = useDraft();

  function choose(source: MusicSource) {
    // TODO: real MusicKit / Spotify OAuth. Until then connecting pre-fills a demo top-artists list.
    update({
      musicSource: source,
      influences: source === "manual" ? draft.influences : DEMO_TOP_ARTISTS.slice(0, 9),
    });
    router.push(nav.next);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader back={nav.back} />
      <StepTitle
        title="Connect your music"
        sub="We read the artists you listen to most, so the musicians we introduce share your influences. We never post or change anything."
      />
      <div className="px-5 pt-7 flex flex-col gap-2.5">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => choose(s.id)}
            className="flex items-center gap-3.5 p-4 rounded-[20px] bg-stage border border-paper/10 text-left active:scale-[0.99] transition"
          >
            <span className="flex-1 flex flex-col gap-0.5">
              <span className="text-[16px] font-semibold">{s.title}</span>
              <span className="text-[13px] text-smoke">{s.sub}</span>
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </main>
  );
}
