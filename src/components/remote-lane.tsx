"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PersonPhoto } from "@/components/person-photo";
import { HeroLink } from "@/components/hero";
import { artistTint } from "@/lib/artists";
import type { Musician } from "@/lib/mock";
import { setOpenToRemote } from "@/app/(app)/remote-actions";

/**
 * Musicians open to remote collabs, at any distance: co-writing, sessions, tracking parts.
 * Location is one limit, not the whole story. If you aren't open to remote yourself, one tap
 * turns it on so musicians anywhere can find you too.
 */
export function RemoteLane({ people, youRemote }: { people: Musician[]; youRemote: boolean }) {
  const [on, setOn] = useState(youRemote);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (!people.length && on) return null;

  const turnOn = () =>
    start(async () => {
      const r = await setOpenToRemote(true);
      if (r.error) setError(r.error);
      else setOn(true);
    });

  return (
    <section aria-labelledby="remote" className="relative flex flex-col gap-3 min-w-0">
      <div className="px-5 md:px-0 flex flex-col gap-1">
        <h2 id="remote" className="text-title3 md:text-title2 font-semibold tracking-[-0.01em]">Open to remote</h2>
        <p className="text-subhead text-smoke text-pretty">Co-writing, sessions and parts tracked from home. Distance doesn&apos;t matter here.</p>
      </div>
      {people.length > 0 && (
        <ul className="stagger hscroll flex gap-2.5 md:gap-3.5 px-5 md:px-0 snap-x snap-mandatory scroll-px-5 md:scroll-px-0">
          {people.map((m) => (
            <li key={m.id} className="snap-start shrink-0 w-[158px] md:w-[210px]">
              <HeroLink href={`/m/${m.username}`} heroKey={m.username} tint={artistTint(m.id)} className="press-card group relative block h-[214px] md:h-[280px] rounded-card-lg overflow-hidden">
                <PersonPhoto person={m} sizes="210px" initialsSize={48} className="object-[50%_30%] transition duration-500 group-hover:scale-[1.04]" />
                <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(15_13_11/0.95))]" />
                <span className="absolute left-2.5 top-2.5 glass h-6 px-2.5 rounded-full text-caption font-semibold flex items-center">Remote</span>
                <span className="absolute inset-x-3 bottom-3 flex flex-col gap-0.5">
                  <span className="text-caption font-semibold tracking-[0.12em] uppercase text-gel-teal truncate">
                    {m.instrument} · {m.neighborhood}
                  </span>
                  <span className="text-body-lg font-semibold truncate">{m.name}</span>
                  <span className="text-caption text-paper/75 truncate">{m.replyLabel ?? m.genres}</span>
                </span>
              </HeroLink>
            </li>
          ))}
        </ul>
      )}
      {!on && (
        <div className="mx-5 md:mx-0 p-4 rounded-card bg-stage flex items-center gap-3">
          <span className="flex-1 text-footnote text-smoke text-pretty">
            {people.length ? "Turn on Remote collabs and these musicians can find you too." : "Up for working with people anywhere? Turn on Remote collabs and you'll show here for musicians in other cities."}
            {error && <span role="alert" className="block text-danger-soft">{error}</span>}
          </span>
          <button type="button" onClick={turnOn} disabled={pending} className="h-11 px-3.5 rounded-full bg-paper text-ink text-footnote font-semibold shrink-0 disabled:opacity-60">
            {pending ? "Turning on…" : "Turn on"}
          </button>
        </div>
      )}
      {on && !youRemote && (
        <p className="px-5 md:px-0 text-footnote text-smoke">
          You&apos;re open to remote. Change it any time on <Link href="/me" className="underline underline-offset-2">your profile</Link>.
        </p>
      )}
    </section>
  );
}
