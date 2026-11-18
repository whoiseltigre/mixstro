"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PersonPhoto } from "@/components/person-photo";
import { SharePage } from "@/components/share-page";
import { nounFor } from "@/lib/instruments";
import type { Area } from "@/lib/people";

const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);

/**
 * Few real musicians near you yet. Instead of pretending with samples, say so: you're early,
 * invite the musicians you know, we'll tell you when a player you need joins, and here are
 * the closest real musicians even past your radius.
 */
export function EarlyArea({ area, username, firstName }: { area: Area; username?: string; firstName?: string }) {
  const [inviting, setInviting] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const where = area.place ? `near ${area.place}` : "near you";
  const players = and(area.alertRoles.slice(0, 3).map((r) => nounFor(r)));
  const title = area.nearby === 0 ? `You're one of the first musicians ${where}` : `Mixstro is just getting started ${where}`;

  return (
    <section
      aria-labelledby="early-area"
      className="relative mx-5 md:mx-0 rounded-[26px] overflow-hidden border border-tungsten/30"
      style={{ background: "linear-gradient(150deg, rgb(255 178 69 / 0.16), rgb(255 172 186 / 0.08) 55%, rgb(26 24 22 / 0.6))" }}
    >
      <div
        aria-hidden="true"
        className="absolute right-[-80px] top-[-90px] w-[280px] h-[220px] rounded-full opacity-40 blur-[70px] pointer-events-none"
        style={{ background: "radial-gradient(#FFB245, transparent 70%)" }}
      />
      <div className="relative p-5 md:p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold tracking-[0.14em] uppercase text-tungsten">You&apos;re early</span>
          <h2 id="early-area" className="font-display text-[24px] md:text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-pretty">
            {title}
          </h2>
          <p className="text-[14.5px] leading-[1.45] text-paper/80 text-pretty">
            {area.nearby === 0
              ? `No one within ${area.radius} mi has joined yet. Every musician you invite makes Mixstro better for you, and they land on your page first.`
              : `${area.nearby} musician${area.nearby === 1 ? " has" : "s have"} joined within ${area.radius} mi so far. Invite the ones you know and it fills up faster.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {username && (
            <button type="button" onClick={() => setInviting(true)} className="h-11 px-5 rounded-full bg-tungsten text-ink text-[15px] font-semibold">
              Invite musicians
            </button>
          )}
          <Link href="/board/new" className="h-11 px-5 rounded-full bg-paper/10 border border-paper/12 text-[15px] font-semibold flex items-center hover:bg-paper/16 transition">
            Post what you need
          </Link>
        </div>

        <Link
          href="/settings/notifications"
          className="flex items-center gap-3 p-3 rounded-[18px] bg-ink/40 border border-paper/8 transition hover:border-paper/25"
        >
          <span className="size-10 rounded-[12px] bg-tungsten/15 text-tungsten flex items-center justify-center shrink-0" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
              <path d="M10 20a2.2 2.2 0 0 0 4 0" />
            </svg>
          </span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-[14px] font-semibold leading-tight text-pretty">
              {players ? `We'll tell you when a ${players} joins within ${area.radius} mi` : "Get told when the player you need joins"}
            </span>
            <span className="text-[12.5px] text-smoke">{players ? "Change who you're looking for" : "Pick the instruments you're looking for"}</span>
          </span>
          <span className="text-[13px] font-semibold text-tungsten shrink-0">{players ? "Change" : "Pick"}</span>
        </Link>

        {area.further.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-semibold text-paper/85">Nearest musicians on Mixstro</span>
            <ul className="hscroll -mx-5 md:-mx-6 px-5 md:px-6 flex gap-3">
              {area.further.map((m) => (
                <li key={m.id} className="shrink-0 w-[76px]">
                  <Link href={`/m/${m.username}`} className="group flex flex-col items-center gap-1.5 text-center">
                    <span className="relative size-[64px] rounded-full overflow-hidden ring-2 ring-paper/10 group-hover:ring-tungsten/60 transition">
                      <PersonPhoto person={m} sizes="64px" initialsSize={22} />
                    </span>
                    <span className="w-full text-[13px] font-semibold truncate">{m.name.split(" ")[0]}</span>
                    <span className="w-full text-[11.5px] text-smoke truncate">
                      {m.instrument} · {m.distanceMi} mi
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {inviting && username && origin && (
        <SharePage username={username} firstName={firstName ?? ""} mine url={`${origin}/@${username}`} openNow onClose={() => setInviting(false)} />
      )}
    </section>
  );
}
