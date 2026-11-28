import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import { HeroLink } from "@/components/hero";
import { artistTint } from "@/lib/artists";
import { PostCard } from "@/components/post-card";
import { buttonClass } from "@/components/ui";
import { EarlyArea } from "@/components/early-area";
import { RoleAlertCard } from "@/components/role-alert";
import { RemoteLane } from "@/components/remote-lane";
import { getBoard } from "@/lib/board";
import { EARLY_AREA, getRoleAlert, getStage, getToday } from "@/lib/people";
import { HomeHeader, YourStage } from "./your-stage";

export const metadata = { title: "Home · Mixstro" };
export const dynamic = "force-dynamic";

/**
 * Home leads with people: who's waiting on you, the musicians near you, then one slim row for
 * your own page and what's on the Board. Never a dead end: every section has somewhere to go.
 */
export default async function Home() {
  const [{ people, incoming, yourTurn, area, remote, youRemote, demo }, board, alert, stage] = await Promise.all([
    getToday(),
    getBoard(),
    getRoleAlert().catch(() => null),
    getStage().catch(() => null),
  ]);
  const asked = people.filter((p) => incoming.includes(p.id));
  const posts = board.posts.filter((p) => !p.mine).slice(0, 6);
  const early = area && area.nearby < EARLY_AREA ? area : null;
  const onlySamples = people.length > 0 && people.every((p) => p.sample);

  return (
    <main className="relative overflow-x-clip pt-safe md:pt-6 pb-36 md:pb-16 flex flex-col gap-7 md:gap-9">
      <div
        aria-hidden="true"
        className="md:hidden absolute right-[-140px] top-[-160px] w-[480px] h-[360px] rounded-full opacity-30 blur-[80px] pointer-events-none"
        style={{ background: "radial-gradient(#B5C5FF, transparent 70%)" }}
      />
      {alert && <RoleAlertCard alert={alert} />}

      <HomeHeader />

      {yourTurn > 0 && (
        <Link href="/messages" className="relative mx-5 md:mx-0 p-4 rounded-card-lg bg-stage border border-gel-teal/40 flex items-center gap-3 transition hover:border-gel-teal">
          <span className="size-2.5 rounded-full bg-gel-teal shrink-0" aria-hidden="true" />
          <span className="flex-1 text-callout font-semibold">
            {yourTurn === 1 ? "A musician is waiting on your reply" : `${yourTurn} musicians are waiting on your reply`}
          </span>
          <span className="text-subhead font-semibold text-gel-teal">Reply</span>
        </Link>
      )}

      <section aria-labelledby="near-you" className="relative flex flex-col gap-3 min-w-0">
        <div className="px-5 md:px-0 flex items-baseline justify-between gap-3">
          <h2 id="near-you" className="text-title3 md:text-title2 font-semibold tracking-[-0.01em]">
            {asked.length ? "Want to play with you" : onlySamples ? "Example musicians" : "Musicians near you"}
          </h2>
          <Link href="/discover/today" className="-my-3 h-11 flex items-center text-subhead font-semibold text-paper">
            See all
          </Link>
        </div>
        {people.length ? (
          <ul className="stagger hscroll flex gap-2.5 md:gap-3.5 px-5 md:px-0 snap-x snap-mandatory scroll-px-5 md:scroll-px-0">
            {[...asked, ...people.filter((p) => !incoming.includes(p.id))].map((m, i) => (
              <li key={m.id} className="snap-start shrink-0 w-[200px] md:w-[230px]">
                <HeroLink href={`/m/${m.username}`} heroKey={m.username} tint={artistTint(m.id)} className="press-card group relative block h-[272px] md:h-[310px] rounded-card-lg overflow-hidden">
                  <PersonPhoto person={m} priority={i < 2} sizes="230px" initialsSize={48} className="object-[50%_30%] transition duration-500 group-hover:scale-[1.04]" />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(15_13_11/0.95))]" />
                  {(incoming.includes(m.id) || (m.sample && !onlySamples)) && (
                    <span className="absolute left-2.5 top-2.5 glass-thick h-7 px-3 rounded-full text-caption font-semibold flex items-center">
                      {incoming.includes(m.id) ? "Asked you" : "Example"}
                    </span>
                  )}
                  <span className="absolute inset-x-3 bottom-3 flex flex-col gap-0.5">
                    <span className="text-caption font-semibold tracking-[0.1em] uppercase text-gel-peach truncate">
                      {m.instrument} · {m.distanceMi ? `${m.distanceMi} mi` : m.neighborhood}
                    </span>
                    <span className="text-body-lg font-semibold truncate">{m.name}</span>
                    {m.lookingFor && <span className="text-caption text-paper/75 truncate">{m.lookingFor}</span>}
                  </span>
                </HeroLink>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyCard title="You're early here" body="Musicians near you show up as they join. Share your page so the ones you know come first." />
        )}
      </section>

      {stage && (
        <div className="md:max-w-[560px]">
          <YourStage stage={stage} />
        </div>
      )}

      {!demo && youRemote !== null && youRemote !== undefined && <RemoteLane people={remote ?? []} youRemote={youRemote} />}

      <section aria-labelledby="on-board" className="relative flex flex-col gap-3">
        <div className="px-5 md:px-0 flex items-baseline justify-between gap-3">
          <h2 id="on-board" className="text-title3 md:text-title2 font-semibold tracking-[-0.01em]">On the Board</h2>
          <Link href="/board" className="-my-3 h-11 flex items-center text-subhead font-semibold text-paper">
            Open
          </Link>
        </div>
        {posts.length ? (
          <ul className="stagger hscroll flex gap-3 md:gap-3.5 px-5 md:px-0 snap-x snap-mandatory scroll-px-5 md:scroll-px-0">
            {posts.map((p) => (
              <li key={p.id} className="snap-start shrink-0 w-[250px] md:w-[300px]">
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyCard title="Nothing posted near you yet" body="Need a drummer, a sub for Saturday, or someone to write with? Post it first." href="/board/new" cta="Post on the Board" />
        )}
      </section>

      {early && <EarlyArea area={early} username={stage?.username} firstName={stage?.firstName} />}
    </main>
  );
}

function EmptyCard({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="mx-5 md:mx-0 p-5 rounded-card-lg bg-stage border border-paper/8 flex flex-col gap-2 items-start">
      <span className="text-body font-semibold">{title}</span>
      <span className="text-subhead text-smoke text-pretty">{body}</span>
      {href && cta && (
        <Link href={href} className={buttonClass("primary", "sm", "mt-1")}>
          {cta}
        </Link>
      )}
    </div>
  );
}
