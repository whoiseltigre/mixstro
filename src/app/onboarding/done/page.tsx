"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArtistAvatar } from "@/components/artist-avatar";
import { Button, ButtonLink } from "@/components/ui";
import { saveProfile, useDraft } from "@/lib/onboarding";

export default function Done() {
  const router = useRouter();
  const { draft, ready } = useDraft();
  const [state, setState] = useState<"saving" | "saved" | "error">("saving");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!ready) return;
    saveProfile(draft).then((r) => {
      if (r.error) {
        setError(r.error);
        setState("error");
      } else setState("saved");
    });
    // Save once when the draft has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function enableNotifications() {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    router.push("/discover");
  }

  const meta = [draft.mainInstrument, draft.genres.slice(0, 2).join(", "), draft.neighborhood.split(",")[0]].filter(Boolean).join(" · ");

  return (
    <main className="min-h-dvh flex flex-col px-5 pt-safe">
      <div className="mt-10 flex flex-col items-center gap-7 text-center">
        <div className="gel-rim rounded-[28px] w-[300px]">
          <div className="rounded-[26.5px] bg-stage overflow-hidden text-left">
            <div className="h-[220px] bg-riser">
              {draft.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.avatarUrl} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="p-4 flex flex-col gap-1.5">
              <span className="text-[12px] text-smoke">{meta}</span>
              <span className="headline text-[28px]">{draft.firstName || "You"}</span>
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
        <div className="flex flex-col gap-2.5">
          <h1 className="headline text-[34px]">You&apos;re in.</h1>
          <p className="text-[15px] leading-[1.45] text-smoke text-pretty">
            Your first five matches arrive tomorrow at 9 AM. Turn on notifications so you don&apos;t miss them.
          </p>
          {state === "error" && (
            <p role="alert" className="text-[13px] text-[#FF453A]">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto pt-6 pb-safe flex flex-col gap-2.5">
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
