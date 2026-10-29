"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArtistAvatar } from "@/components/artist-avatar";
import { PersonPhoto } from "@/components/person-photo";
import { LogoMark } from "@/components/ui";
import type { Musician } from "@/lib/mock";
import { connect, pass } from "../actions";

/** Today's musicians, one at a time. Connect or pass moves to the next. */
export function TodayDeck({ people, incoming }: { people: Musician[]; incoming: string[] }) {
  const [index, setIndex] = useState(0);
  const [sentTo, setSentTo] = useState<string>();
  const [pending, start] = useTransition();
  const m = people[index];

  if (!m) return <AllCaughtUp total={people.length} />;

  const first = m.name.split(" ")[0];
  const asked = incoming.includes(m.id);
  const next = () => {
    setSentTo(undefined);
    setIndex((i) => i + 1);
  };

  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[71%]">
        <PersonPhoto person={m} priority sizes="440px" initialsSize={96} className="object-[50%_30%]" />
      </div>
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/70 to-transparent" />
      <div className="absolute inset-x-0 top-[38%] h-[36%] bg-gradient-to-b from-ink/0 via-ink/85 to-ink" />
      <div className="absolute inset-x-0 top-[74%] bottom-0 bg-ink" />

      <header className="absolute inset-x-5 top-0 pt-safe mt-2 flex items-center justify-between">
        <LogoMark size={24} />
        <span className="glass h-8 px-3 rounded-full flex items-center text-[13px] font-semibold">
          {index + 1} of {people.length} today
        </span>
      </header>

      <div className="absolute inset-x-0 bottom-0 pb-[calc(max(env(safe-area-inset-bottom),16px)+96px)] flex flex-col gap-6">
        <div className="px-5 flex flex-col gap-2">
          {m.sample && (
            <span className="self-start glass h-7 px-3 rounded-full flex items-center text-[12px] font-semibold text-smoke">Sample profile</span>
          )}
          {asked && (
            <span className="self-start glass h-7 px-3 rounded-full flex items-center text-[12px] font-semibold">
              {first} wants to play with you
            </span>
          )}
          <span className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.16em] uppercase">
            <span className="size-2 rounded-full bg-tungsten" />
            {m.instrument} · {m.genres} · {m.distanceMi ? `${m.distanceMi} mi` : m.neighborhood}
          </span>
          <h1 className="headline text-[52px] leading-[0.95]">
            <Link href={`/m/${m.username}`}>{m.name}</Link>
          </h1>
        </div>

        <section aria-label="Influence overlap" className="glass mx-4 rounded-[24px] py-3.5 flex flex-col gap-2.5 overflow-hidden">
          <div className="px-4 flex items-baseline justify-between gap-2">
            <span className="text-[16px] font-semibold">
              {m.shared.length ? `${m.shared.length} shared influence${m.shared.length === 1 ? "" : "s"}` : "New sounds for you"}
            </span>
            <span className="text-[13px] text-smoke">
              {m.commitment}
              {m.sameCommitment ? ", like you" : ""}
            </span>
          </div>
          <div className="hscroll flex gap-1.5 px-4">
            {(m.shared.length ? m.shared : m.influences.slice(0, 4)).map((a) => (
              <span key={a.id} className="shrink-0 flex items-center gap-2 h-8 pl-1 pr-3 rounded-full bg-paper/8 border border-paper/12 text-[13px] whitespace-nowrap">
                <ArtistAvatar artist={a} size={24} />
                {a.name}
              </span>
            ))}
          </div>
        </section>

        {sentTo === m.id ? (
          <div className="px-5 flex items-center gap-3">
            <p className="flex-1 text-[15px] leading-[1.4]">
              Sent. We&apos;ll tell you when {first} says yes.
            </p>
            <button onClick={next} className="h-[51px] px-6 rounded-full bg-paper text-ink text-[17px] font-semibold">
              Next
            </button>
          </div>
        ) : (
          <div className="px-5 flex items-center gap-3">
            <Link href={`/m/${m.username}`} aria-label={`See ${first}'s profile and clips`} className="glass size-[54px] rounded-full flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
            </Link>
            <div className="gel-rim rounded-full flex-1">
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await connect(m.id, m.username);
                    if (res?.sent) setSentTo(m.id);
                  })
                }
                className="w-full h-[51px] rounded-full bg-paper text-ink text-[17px] font-semibold flex items-center justify-center disabled:opacity-70"
              >
                {asked ? `Connect with ${first}` : "Connect"}
              </button>
            </div>
            <button
              aria-label="Pass"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await pass(m.id);
                  next();
                })
              }
              className="glass size-[54px] rounded-full flex items-center justify-center shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function AllCaughtUp({ total }: { total: number }) {
  return (
    <main className="relative min-h-dvh px-5 pt-safe pb-32 flex flex-col overflow-hidden">
      <div aria-hidden="true" className="absolute left-1/2 top-[-120px] -translate-x-1/2 w-[520px] h-[360px] rounded-full opacity-30 blur-[90px]" style={{ background: "radial-gradient(#FFB245, transparent 70%)" }} />
      <header className="relative mt-2 flex items-center">
        <LogoMark size={24} />
      </header>
      <div className="relative flex-1 flex flex-col justify-center gap-3">
        <h1 className="headline text-[40px] leading-none" style={{ fontWeight: 700 }}>
          {total ? "That's today." : "You're early."}
        </h1>
        <p className="text-[16px] leading-[1.5] text-smoke">
          {total
            ? "New musicians land here tomorrow. Meanwhile, see who's posting on the Board."
            : "Musicians near you will show up here as they join. Post on the Board so they can find you first."}
        </p>
        <div className="flex gap-2.5 pt-3">
          <Link href="/board" className="h-12 px-5 rounded-full bg-paper text-ink text-[16px] font-semibold flex items-center">
            Open the Board
          </Link>
          <Link href="/search" className="glass h-12 px-5 rounded-full text-[16px] font-medium flex items-center">
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
