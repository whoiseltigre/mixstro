"use client";

import Link from "next/link";
import { ArtistAvatar } from "@/components/artist-avatar";
import { ClipCard } from "@/components/clip-card";
import { ButtonLink } from "@/components/ui";
import { parseClip } from "@/lib/clips";
import { COMMITMENT, useDraft } from "@/lib/onboarding";

export default function Me() {
  const { draft, ready } = useDraft();
  if (!ready) return null;

  if (!draft.firstName) {
    return (
      <main className="min-h-dvh px-5 pt-safe flex flex-col justify-center gap-4">
        <h1 className="headline text-[34px]">No profile yet</h1>
        <p className="text-smoke">Set up your profile to start getting matches.</p>
        <ButtonLink href="/onboarding/basics">Set up my profile</ButtonLink>
      </main>
    );
  }

  return (
    <main className="pt-safe px-5 pb-32 flex flex-col gap-6">
      <div className="mt-6 flex items-center gap-4">
        <span className="size-20 rounded-full bg-riser overflow-hidden shrink-0">
          {draft.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.avatarUrl} alt="" className="size-full object-cover" />
          )}
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="headline text-[32px]">{draft.firstName}</h1>
          <span className="text-[14px] text-smoke">@{draft.username.replace(/^@/, "")}</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        <Fact label="Plays" value={draft.instruments.join(", ")} />
        <Fact label="Genres" value={draft.genres.join(", ")} />
        <Fact label="Commitment" value={COMMITMENT[draft.commitment]} />
        <Fact label="Where" value={`${draft.neighborhood} · ${draft.radiusMi} mi`} />
      </dl>
      <section className="flex flex-col gap-2.5">
        <h2 className="text-[17px] font-semibold">Influences</h2>
        <div className="hscroll flex gap-4 -mx-5 px-5">
          {draft.influences.map((a) => (
            <div key={a.id} className="w-[80px] shrink-0 flex flex-col items-center gap-2">
              <ArtistAvatar artist={a} size={76} />
              <span className="text-[12px] font-semibold text-center truncate max-w-full">{a.name}</span>
            </div>
          ))}
        </div>
      </section>
      {draft.clips.some((c) => c.kind === "clip") && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[17px] font-semibold">Clips</h2>
          <div className="hscroll flex gap-2.5 -mx-5 px-5 items-start">
            {draft.clips.map((c) => {
              const p = c.kind === "clip" ? parseClip(c.value) : null;
              return p ? <ClipCard key={c.value} clip={p} /> : null;
            })}
          </div>
        </section>
      )}
      <div className="flex gap-5">
        <Link href="/onboarding/basics" className="text-[15px] font-semibold underline underline-offset-2">
          Edit profile
        </Link>
        <Link href="/settings" className="text-[15px] font-semibold underline underline-offset-2">
          Settings
        </Link>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-stage flex flex-col gap-1">
      <dt className="text-[12px] text-smoke">{label}</dt>
      <dd className="text-[15px] font-medium">{value || "—"}</dd>
    </div>
  );
}
