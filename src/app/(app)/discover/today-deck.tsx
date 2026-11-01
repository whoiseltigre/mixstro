"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArtistAvatar } from "@/components/artist-avatar";
import { PersonPhoto } from "@/components/person-photo";
import { LogoMark } from "@/components/ui";
import type { Musician } from "@/lib/mock";
import { whyYouTwo } from "@/lib/why";
import { connect, pass } from "../actions";

/** Today's musicians: one at a time on phones, a gallery from 768px. Connect or pass moves to the next. */
export function TodayDeck({
  people,
  incoming,
}: {
  people: Musician[];
  incoming: string[];
}) {
  const [done, setDone] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [pending, start] = useTransition();
  const remaining = people.filter((p) => !done.includes(p.id));
  const m = remaining.find((p) => p.id === currentId) ?? remaining[0];

  if (!m) return <AllCaughtUp total={people.length} />;

  const first = m.name.split(" ")[0];
  const asked = incoming.includes(m.id);
  const index = done.length;
  const next = () => {
    setSentTo(undefined);
    setCurrentId(undefined);
    setDone((d) => [...d, m.id]);
  };
  const doConnect = () =>
    start(async () => {
      const res = await connect(m.id, m.username);
      if (res?.sent) setSentTo(m.id);
    });
  const doPass = () =>
    start(async () => {
      await pass(m.id);
      next();
    });
  const why = whyYouTwo({
    shared: m.shared.map((a) => a.name),
    commitment: m.commitment,
    sameCommitment: m.sameCommitment,
    sharedDays: m.sharedDays,
    distanceMi: m.distanceMi,
  });

  return (
    <>
      <Gallery
        people={remaining}
        current={m}
        total={people.length}
        why={why}
        asked={asked}
        sent={sentTo === m.id}
        pending={pending}
        onPick={(id) => {
          setSentTo(undefined);
          setCurrentId(id);
        }}
        onConnect={doConnect}
        onPass={doPass}
        onNext={next}
      />
      <main className="md:hidden relative h-dvh overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[71%]">
          <PersonPhoto
            person={m}
            priority
            sizes="440px"
            initialsSize={96}
            className="object-[50%_30%]"
          />
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
              <span className="self-start glass h-7 px-3 rounded-full flex items-center text-[12px] font-semibold text-smoke">
                Sample profile
              </span>
            )}
            {asked && (
              <span className="self-start glass h-7 px-3 rounded-full flex items-center text-[12px] font-semibold">
                {first} wants to play with you
              </span>
            )}
            <span className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.16em] uppercase">
              <span className="size-2 rounded-full bg-tungsten" />
              {m.instrument} · {m.genres} ·{" "}
              {m.distanceMi ? `${m.distanceMi} mi` : m.neighborhood}
            </span>
            <h1 className="headline text-[52px] leading-[0.95]">
              <Link href={`/m/${m.username}`}>{m.name}</Link>
            </h1>
            <p className="text-[15px] leading-[1.35] text-paper/80 text-pretty">
              {why}
            </p>
          </div>

          <section
            aria-label="Influence overlap"
            className="glass mx-4 rounded-[24px] py-3.5 flex flex-col gap-2.5 overflow-hidden"
          >
            <div className="px-4 flex items-baseline justify-between gap-2">
              <span className="text-[16px] font-semibold">
                {m.shared.length
                  ? `${m.shared.length} shared influence${m.shared.length === 1 ? "" : "s"}`
                  : "New sounds for you"}
              </span>
              <span className="text-[13px] text-smoke">
                {m.commitment}
                {m.sameCommitment ? ", like you" : ""}
              </span>
            </div>
            <div className="hscroll flex gap-1.5 px-4">
              {(m.shared.length ? m.shared : m.influences.slice(0, 4)).map(
                (a) => (
                  <span
                    key={a.id}
                    className="shrink-0 flex items-center gap-2 h-8 pl-1 pr-3 rounded-full bg-paper/8 border border-paper/12 text-[13px] whitespace-nowrap"
                  >
                    <ArtistAvatar artist={a} size={24} />
                    {a.name}
                  </span>
                ),
              )}
            </div>
          </section>

          {sentTo === m.id ? (
            <div className="px-5 flex items-center gap-3">
              <p className="flex-1 text-[15px] leading-[1.4]">
                Sent. We&apos;ll tell you when {first} says yes.
              </p>
              <button
                onClick={next}
                className="h-[51px] px-6 rounded-full bg-paper text-ink text-[17px] font-semibold"
              >
                Next
              </button>
            </div>
          ) : (
            <div className="px-5 flex items-center gap-3">
              <Link
                href={`/m/${m.username}`}
                aria-label={`See ${first}'s profile and clips`}
                className="glass size-[54px] rounded-full flex items-center justify-center shrink-0"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 4l13 8-13 8z" />
                </svg>
              </Link>
              <div className="gel-rim rounded-full flex-1">
                <button
                  disabled={pending}
                  onClick={doConnect}
                  className="w-full h-[51px] rounded-full bg-paper text-ink text-[17px] font-semibold flex items-center justify-center disabled:opacity-70"
                >
                  {asked ? `Connect with ${first}` : "Connect"}
                </button>
              </div>
              <button
                aria-label="Pass"
                disabled={pending}
                onClick={doPass}
                className="glass size-[54px] rounded-full flex items-center justify-center shrink-0"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

/** From 768px: the current musician large with actions, the rest of today beside them. Arrow keys move, C connects, P passes. */
function Gallery({
  people,
  current: m,
  total,
  why,
  asked,
  sent,
  pending,
  onPick,
  onConnect,
  onPass,
  onNext,
}: {
  people: Musician[];
  current: Musician;
  total: number;
  why: string;
  asked: boolean;
  sent: boolean;
  pending: boolean;
  onPick: (id: string) => void;
  onConnect: () => void;
  onPass: () => void;
  onNext: () => void;
}) {
  const first = m.name.split(" ")[0];
  const others = people.filter((p) => p.id !== m.id).slice(0, 3);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (e.target as HTMLElement).closest("input, textarea, [contenteditable]")
      )
        return;
      if (window.matchMedia("(max-width: 767px)").matches || pending) return;
      const i = people.findIndex((p) => p.id === m.id);
      if (e.key === "ArrowRight" && people[i + 1]) onPick(people[i + 1].id);
      else if (e.key === "ArrowLeft" && people[i - 1]) onPick(people[i - 1].id);
      else if (e.key.toLowerCase() === "c" && !sent) onConnect();
      else if (e.key.toLowerCase() === "p") onPass();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [people, m.id, sent, pending, onPick, onConnect, onPass]);

  return (
    <main className="hidden md:flex flex-col gap-6 pt-6 pb-10 min-h-[calc(100dvh-88px)]">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="headline text-[44px]">
            Today&apos;s {total === 5 ? "five" : "musicians"}
          </h1>
          <p className="text-[15px] text-smoke">
            Musicians near you who want what you want. New every morning.
          </p>
        </div>
        <span className="glass h-8 px-3.5 rounded-full flex items-center text-[13px] font-semibold shrink-0">
          {total - people.length + 1} of {total} today
        </span>
      </div>

      <div
        className={`flex-1 min-h-[560px] grid gap-3.5 ${others.length ? "grid-cols-[1.7fr_1fr] lg:grid-cols-[1.4fr_repeat(var(--n),1fr)]" : "grid-cols-1 max-w-[720px]"}`}
        style={{ "--n": others.length } as React.CSSProperties}
      >
        <article className="relative rounded-[28px] overflow-hidden ring-2 ring-tungsten">
          <PersonPhoto
            person={m}
            priority
            sizes="(min-width: 1100px) 560px, 50vw"
            initialsSize={120}
            className="object-[50%_30%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgb(15_13_11/0.97)_78%)]" />
          <div className="absolute inset-x-6 bottom-6 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {m.sample && (
                <span className="glass h-7 px-3 rounded-full flex items-center text-[12px] font-semibold text-smoke">
                  Sample profile
                </span>
              )}
              {asked && (
                <span className="glass h-7 px-3 rounded-full flex items-center text-[12px] font-semibold">
                  {first} wants to play with you
                </span>
              )}
            </div>
            <span className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.16em] uppercase">
              <span className="size-2 rounded-full bg-tungsten" />
              {m.instrument} ·{" "}
              {m.distanceMi ? `${m.distanceMi} mi` : m.neighborhood}
            </span>
            <h2 className="headline text-[60px] leading-[0.95]">
              <Link
                href={`/m/${m.username}`}
                className="hover:underline underline-offset-4 decoration-2"
              >
                {m.name}
              </Link>
            </h2>
            <p className="text-[15px] leading-[1.4] text-paper/80 text-pretty max-w-[460px]">
              {why}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(m.shared.length ? m.shared : m.influences.slice(0, 4))
                .slice(0, 4)
                .map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-2 h-8 pl-1 pr-3 rounded-full bg-paper/8 border border-paper/12 text-[13px] whitespace-nowrap"
                  >
                    <ArtistAvatar artist={a} size={24} />
                    {a.name}
                  </span>
                ))}
            </div>
            {sent ? (
              <div className="flex items-center gap-3 pt-1">
                <p className="flex-1 text-[15px]">
                  Sent. We&apos;ll tell you when {first} says yes.
                </p>
                <button
                  onClick={onNext}
                  className="h-12 px-6 rounded-full bg-paper text-ink text-[16px] font-semibold hover:bg-paper/90"
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  disabled={pending}
                  onClick={onPass}
                  className="glass h-12 px-6 rounded-full text-[16px] font-semibold hover:bg-paper/10 transition"
                >
                  Pass
                </button>
                <div className="gel-rim rounded-full flex-1">
                  <button
                    disabled={pending}
                    onClick={onConnect}
                    className="w-full h-12 rounded-full bg-paper text-ink text-[16px] font-semibold disabled:opacity-70 hover:bg-paper/90"
                  >
                    {asked ? `Connect with ${first}` : "Connect"}
                  </button>
                </div>
                <Link
                  href={`/m/${m.username}`}
                  className="glass h-12 px-5 rounded-full text-[15px] font-semibold flex items-center hover:bg-paper/10 transition"
                >
                  Profile
                </Link>
              </div>
            )}
          </div>
        </article>

        {others.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            aria-label={`Show ${p.name}`}
            // Tablets have room for the next musician only; desktops show the rest of today.
            className={`group relative rounded-[28px] overflow-hidden text-left ${i > 0 ? "hidden lg:block" : ""}`}
          >
            <PersonPhoto
              person={p}
              sizes="(min-width: 1100px) 320px, 25vw"
              initialsSize={64}
              className="object-[50%_30%] transition duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(15_13_11/0.92))] transition group-hover:bg-[linear-gradient(180deg,transparent_35%,rgb(15_13_11/0.92))]" />
            <div className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-paper/85">
                {p.instrument} ·{" "}
                {p.distanceMi ? `${p.distanceMi} mi` : p.neighborhood}
              </span>
              <span className="headline text-[36px] leading-none">
                {p.name.split(" ")[0]}
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[12px] text-smoke/70">
        Tip: ← → to move, C to connect, P to pass.
      </p>
    </main>
  );
}

function AllCaughtUp({ total }: { total: number }) {
  return (
    <main className="relative min-h-dvh md:min-h-[calc(100dvh-88px)] px-5 md:px-0 pt-safe pb-32 flex flex-col overflow-hidden md:overflow-visible">
      <div
        aria-hidden="true"
        className="md:hidden absolute left-1/2 top-[-120px] -translate-x-1/2 w-[520px] h-[360px] rounded-full opacity-30 blur-[90px]"
        style={{ background: "radial-gradient(#FFB245, transparent 70%)" }}
      />
      <header className="relative mt-2 flex items-center md:hidden">
        <LogoMark size={24} />
      </header>
      <div className="relative flex-1 flex flex-col justify-center gap-3">
        <h1
          className="headline text-[40px] leading-none"
          style={{ fontWeight: 700 }}
        >
          {total ? "That's today." : "You're early."}
        </h1>
        <p className="text-[16px] leading-[1.5] text-smoke">
          {total
            ? "New musicians land here tomorrow. Meanwhile, see who's posting on the Board."
            : "Musicians near you will show up here as they join. Post on the Board so they can find you first."}
        </p>
        <div className="flex gap-2.5 pt-3">
          <Link
            href="/board"
            className="h-12 px-5 rounded-full bg-paper text-ink text-[16px] font-semibold flex items-center"
          >
            Open the Board
          </Link>
          <Link
            href="/search"
            className="glass h-12 px-5 rounded-full text-[16px] font-medium flex items-center"
          >
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
