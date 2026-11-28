"use client";

import { ConnectSheet } from "@/components/connect-sheet";
import { announceConnect } from "@/components/push-prompt";
import { toast } from "@/components/toast";
import { QuickReplies } from "@/components/quick-replies";
import { useState, useTransition } from "react";
import { ArtistAvatar } from "@/components/artist-avatar";
import { EarlyArea } from "@/components/early-area";
import { HeroLink } from "@/components/hero";
import { PersonPhoto } from "@/components/person-photo";
import { Button, ButtonLink, CheckIcon, LogoMark, VerifiedMark } from "@/components/ui";
import { artistTint } from "@/lib/artists";
import type { Musician } from "@/lib/mock";
import type { Area } from "@/lib/people";
import { whyYouTwo } from "@/lib/why";
import { connect } from "../../actions";

/**
 * Today's musicians as a lineup: everyone picked for you today on one screen, each with why you
 * two might click and one action, Connect. Nobody is judged one at a time and nobody is "passed":
 * tomorrow simply brings new people. (Someone who asked you still gets a kind one-tap answer.)
 */
export function TodayDeck({
  people,
  incoming,
  notes = {},
  early,
}: {
  people: Musician[];
  incoming: string[];
  /** The note each person who asked you sent, by their id. */
  notes?: Record<string, string>;
  /** Few real musicians near you yet: the end of Today says so and offers invites. */
  early?: Early;
}) {
  const [sheetFor, setSheetFor] = useState<Musician>();
  const [sent, setSent] = useState<string[]>([]);
  const [closed, setClosed] = useState<string[]>([]);
  const [sampleNote, setSampleNote] = useState<string>();
  const [pending, start] = useTransition();

  // People who asked you come first; the rest keep the order they were picked in.
  const lineup = [...people.filter((p) => incoming.includes(p.id)), ...people.filter((p) => !incoming.includes(p.id))].filter((p) => !closed.includes(p.id));
  if (!lineup.length) return <AllCaughtUp total={people.length} early={early} />;
  const onlySamples = lineup.every((p) => p.sample);

  const doConnect = (m: Musician) => {
    const first = m.name.split(" ")[0];
    // Samples are there to show how Today works. Connecting explains that instead of a pretend chat.
    if (m.sample) return setSampleNote(m.id);
    // A new Connect opens the note sheet; answering someone who asked you connects straight away.
    if (!incoming.includes(m.id)) return setSheetFor(m);
    // Shows as sent straight away; only a failure takes it back.
    setSent((s) => [...s, m.id]);
    start(async () => {
      const undo = () => setSent((s) => s.filter((x) => x !== m.id));
      try {
        const res = await connect(m.id, m.username);
        if (res && "sent" in res && res.sent) announceConnect(first);
        else if (res && "error" in res) {
          undo();
          toast(res.error);
        }
      } catch {
        undo();
        toast("That didn't send. Check your connection and try again.");
      }
    });
  };

  return (
    <>
      {sheetFor && (
        <ConnectSheet
          person={sheetFor}
          onClose={() => setSheetFor(undefined)}
          onSent={() => {
            setSent((s) => [...s, sheetFor.id]);
            announceConnect(sheetFor.name.split(" ")[0]);
            setSheetFor(undefined);
          }}
        />
      )}
      <main className="pt-safe md:pt-6 pb-36 md:pb-16 flex flex-col gap-5 md:gap-7">
        <header className="mt-3 md:mt-0 px-5 md:px-0 flex flex-col gap-1.5">
          <span className="eyebrow text-gel-peach">
            {lineup.length} {lineup.length === 1 ? "musician" : "musicians"} today
          </span>
          <h1 className="headline text-display md:text-display-lg">Today&apos;s lineup</h1>
          <p className="text-callout text-smoke text-pretty max-w-[520px]">
            {onlySamples
              ? "These are examples, so you can see how it works. Real musicians near you take their place as they join."
              : "Picked for what you play, who you love and where you are. New every morning."}
          </p>
        </header>

        <ul className="stagger px-5 md:px-0 grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
          {lineup.map((m, i) => (
            <li key={m.id} className="min-w-0">
              <LineupCard
                m={m}
                priority={i < 2}
                asked={incoming.includes(m.id)}
                note={notes[m.id]}
                sent={sent.includes(m.id)}
                sampleNote={sampleNote === m.id}
                showSampleTag={m.sample === true && !onlySamples}
                pending={pending}
                onConnect={() => doConnect(m)}
                onClosed={() => setClosed((c) => [...c, m.id])}
              />
            </li>
          ))}
        </ul>

        <footer className="px-5 md:px-0 flex flex-col gap-3">
          {early ? (
            <div className="-mx-5 md:mx-0">
              <EarlyArea area={early.area} username={early.username} firstName={early.firstName} />
            </div>
          ) : (
            <div className="rounded-card-lg bg-stage border border-paper/8 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-semibold">That&apos;s today&apos;s lineup</span>
                <span className="text-subhead text-smoke">New musicians land here tomorrow. Meanwhile, the Board has open spots.</span>
              </span>
              <span className="flex gap-2.5">
                <ButtonLink href="/board" size="sm" className="shrink-0">
                  Open the Board
                </ButtonLink>
                <ButtonLink href="/search" size="sm" variant="glass" className="shrink-0">
                  Search
                </ButtonLink>
              </span>
            </div>
          )}
        </footer>
      </main>
    </>
  );
}

/** One musician in the lineup: photo and name open the profile, then why you two, what you share, and Connect. */
function LineupCard({
  m,
  priority,
  asked,
  note,
  sent,
  sampleNote,
  showSampleTag,
  pending,
  onConnect,
  onClosed,
}: {
  m: Musician;
  priority: boolean;
  asked: boolean;
  note?: string;
  sent: boolean;
  sampleNote: boolean;
  showSampleTag: boolean;
  pending: boolean;
  onConnect: () => void;
  onClosed: () => void;
}) {
  const first = m.name.split(" ")[0];
  const why =
    m.sample && !m.shared.length && m.distanceMi == null
      ? m.lookingFor
      : whyYouTwo({ shared: m.shared.map((a) => a.name), commitment: m.commitment, sameCommitment: m.sameCommitment, sharedDays: m.sharedDays, distanceMi: m.distanceMi });
  const artists = (m.shared.length ? m.shared : m.influences).slice(0, 4);

  return (
    <article className="h-full rounded-card-lg overflow-hidden bg-stage border border-paper/8 flex flex-col">
      <HeroLink href={`/m/${m.username}`} heroKey={m.username} tint={artistTint(m.id)} className="press-card group relative block h-[250px] md:h-[280px] overflow-hidden">
        <PersonPhoto person={m} priority={priority} sizes="(min-width: 768px) 420px, 100vw" initialsSize={72} className="object-[50%_28%] transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgb(26_24_22/0.96))]" />
        {(asked || showSampleTag) && (
          <span className="absolute left-3 top-3 glass-thick h-8 px-3 rounded-full flex items-center text-footnote font-semibold">{asked ? `${first} wants to play with you` : "Example"}</span>
        )}
        <span className="absolute inset-x-4 bottom-3 flex flex-col gap-1">
          <span className="text-caption font-semibold tracking-[0.14em] uppercase text-gel-peach truncate">
            {m.instrument} · {m.genres} · {m.distanceMi ? `${m.distanceMi} mi` : m.neighborhood}
          </span>
          <span className="headline text-title-lg flex items-center gap-2">
            {m.name}
            {m.verified && <VerifiedMark size={18} />}
          </span>
        </span>
      </HeroLink>

      <div className="flex-1 p-4 pt-3 flex flex-col gap-3.5">
        <p className="text-callout leading-[1.4] text-paper/85 text-pretty">{why}</p>

        {artists.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-footnote text-smoke">{m.shared.length ? `You both love` : `${first} loves`}</span>
            <div className="hscroll flex gap-1.5 -mx-4 px-4">
              {artists.map((a) => (
                <span key={a.id} className="shrink-0 flex items-center gap-2 h-9 pl-1 pr-3 rounded-full bg-paper/8 border border-paper/12 text-footnote whitespace-nowrap">
                  <ArtistAvatar artist={a} size={26} />
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {asked && !sent && <QuickReplies otherId={m.id} username={m.username} first={first} note={note} onClosed={onClosed} />}

        <div className="mt-auto pt-0.5">
          {sampleNote ? (
            <p className="text-subhead leading-[1.4] text-smoke text-pretty">{first} is an example, so there&apos;s nobody to connect with here. With a real musician, this opens a short note to send them.</p>
          ) : sent ? (
            <p className="h-12 flex items-center gap-2 text-callout">
              <span className="size-6 rounded-full bg-paper text-ink flex items-center justify-center shrink-0">
                <CheckIcon size={13} />
              </span>
              Sent. We&apos;ll tell you when {first} says yes.
            </p>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button variant="gel" size="md" wide disabled={pending} onClick={onConnect}>
                {asked ? `Connect with ${first}` : "Connect"}
              </Button>
              <ButtonLink href={`/m/${m.username}`} variant="glass" size="md" className="shrink-0">
                Profile
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

type Early = { area: Area; username?: string; firstName?: string };

function AllCaughtUp({ total, early }: { total: number; early?: Early }) {
  if (early) {
    return (
      <main className="relative min-h-dvh md:min-h-[calc(100dvh-88px)] pt-safe pb-32 flex flex-col justify-center gap-4 md:max-w-[640px]">
        <header className="relative mt-2 px-5 flex items-center md:hidden">
          <LogoMark size={24} />
        </header>
        <p className="px-5 md:px-0 text-callout text-smoke">That&apos;s all for today.</p>
        <EarlyArea area={early.area} username={early.username} firstName={early.firstName} />
      </main>
    );
  }
  return (
    <main className="relative min-h-dvh md:min-h-[calc(100dvh-88px)] px-5 md:px-0 pt-safe pb-32 flex flex-col overflow-hidden md:overflow-visible">
      <div
        aria-hidden="true"
        className="md:hidden absolute left-1/2 top-[-120px] -translate-x-1/2 w-[520px] h-[360px] rounded-full opacity-30 blur-[90px]"
        style={{ background: "radial-gradient(#F7BF77, transparent 70%)" }}
      />
      <header className="relative mt-2 flex items-center md:hidden">
        <LogoMark size={24} />
      </header>
      <div className="relative flex-1 flex flex-col justify-center gap-3">
        <h1
          className="headline text-display-md leading-none"
        >
          {total ? "That's today." : "You're early."}
        </h1>
        <p className="text-body leading-[1.5] text-smoke">
          {total
            ? "New musicians land here tomorrow. Meanwhile, see who's posting on the Board."
            : "Musicians near you will show up here as they join. Post on the Board so they can find you first."}
        </p>
        <div className="flex gap-2.5 pt-3">
          <ButtonLink href="/board" size="md">
            Open the Board
          </ButtonLink>
          <ButtonLink href="/search" size="md" variant="glass">
            Search
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
