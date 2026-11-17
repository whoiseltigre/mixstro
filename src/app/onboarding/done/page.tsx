"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArtistAvatar } from "@/components/artist-avatar";
import { Button, ButtonLink } from "@/components/ui";
import { headlineFor } from "@/lib/instruments";
import { saveProfile, savedBandPageId, useDraft } from "@/lib/onboarding";
import { enablePush } from "@/lib/push-client";

export default function Done() {
  const router = useRouter();
  const { draft, ready } = useDraft();
  const [state, setState] = useState<"saving" | "saved" | "error">("saving");
  const [error, setError] = useState<string>();
  const [bandPage, setBandPage] = useState<number>();
  // Came in through a bandmate's "Confirm your spot" link: take them back to it.
  const [joinToken, setJoinToken] = useState<string>();
  useEffect(() => {
    const t = document.cookie.split("; ").find((c) => c.startsWith("mx_join="))?.slice(8);
    if (t && /^[0-9a-f]{32}$/.test(t)) setJoinToken(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveProfile(draft).then((r) => {
      if (r.error) {
        setError(r.error);
        setState("error");
      } else {
        setBandPage(savedBandPageId());
        setState("saved");
      }
    });
    // Save once when the draft has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function enableNotifications() {
    await enablePush().catch(() => {});
    router.push("/discover");
  }

  const meta = [headlineFor(draft.instruments, draft.mainInstrument), draft.band?.name, draft.neighborhood.split(",")[0]].filter(Boolean).join(" · ");

  return (
    <main className="min-h-dvh flex flex-col px-5 pt-safe">
      <div className="mt-10 flex flex-col items-center gap-7 text-center">
        <div className="relative">
        {state === "saved" && <Confetti />}
        <div className="rise-in gel-rim rounded-[28px] w-[300px] shadow-[0_30px_80px_-30px_#FFB245]">
          <div className="rounded-[26.5px] bg-stage overflow-hidden text-left">
            <div className="h-[220px] bg-riser">
              {draft.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.avatarUrl} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              <span className="text-[12px] text-smoke">{meta}</span>
              <span className="font-display text-[28px] font-semibold tracking-[-0.03em]">{draft.firstName || "You"}</span>
              <div className="flex -space-x-2 pt-1">
                {draft.influences.slice(0, 5).map((a) => (
                  <span key={a.id} className="rounded-full border-2 border-stage">
                    <ArtistAvatar artist={a} size={30} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[34px] font-semibold tracking-[-0.03em]">You&apos;re in.</h1>
          <p className="text-[15px] leading-[1.45] text-smoke text-pretty">
            Your profile is live. Turn on notifications so you know when a musician reaches out.
          </p>
          {state === "error" && (
            <p role="alert" className="text-[13px] text-[#FF453A]">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto pt-6 pb-safe flex flex-col gap-2.5">
        {draft.band?.name && state === "saved" && (
          <ButtonLink variant="glass" href={bandPage ? `/b/${bandPage}` : "/me/projects"} className="mb-1">
            See {draft.band.name}&apos;s page and invite the band
          </ButtonLink>
        )}
        {joinToken && state === "saved" && (
          <ButtonLink href={`/join/${joinToken}`} className="mb-1">
            Now confirm your spot in the band
          </ButtonLink>
        )}
        <Button variant="gel" onClick={enableNotifications} disabled={state === "saving"}>
          {state === "saving" ? "Saving your profile…" : "Turn on notifications"}
        </Button>
        <ButtonLink variant="glass" href="/board">
          Browse the Board first
        </ButtonLink>
      </div>
    </main>
  );
}

// Gel-colored confetti that bursts once from behind your new profile card.
const COLORS = ["#FFB245", "#FFACBA", "#C9B6FF", "#FF8A6B", "#F7BF77", "#FFD27A"];
const PIECES = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 140 + ((i * 37) % 90);
  return {
    color: COLORS[i % COLORS.length],
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist * 0.8 - 40),
    rot: ((i * 83) % 360) + 180,
    w: i % 2 ? 6 : 9,
    delay: (i % 5) * 30,
  };
});

function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 z-10">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti absolute block rounded-[2px]"
          style={
            {
              width: p.w,
              height: 14 - p.w / 2,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
