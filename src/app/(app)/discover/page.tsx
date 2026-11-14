import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import { PostCard } from "@/components/post-card";
import { RoleAlertCard } from "@/components/role-alert";
import { getBoard } from "@/lib/board";
import { getRoleAlert, getStage, getToday } from "@/lib/people";
import { HomeHeader, YourStage } from "./your-stage";

export const metadata = { title: "Home · Mixstro" };
export const dynamic = "force-dynamic";

/**
 * Home: your own page first (Your stage, then a nudge to share it), then the musicians near you
 * and what's on the Board. Never a dead end: every section has somewhere to go.
 */
export default async function Home() {
  const [{ people, incoming, yourTurn }, board, alert, stage] = await Promise.all([
    getToday(),
    getBoard(),
    getRoleAlert().catch(() => null),
    getStage().catch(() => null),
  ]);
  const asked = people.filter((p) => incoming.includes(p.id));
  const posts = board.posts.filter((p) => !p.mine).slice(0, 6);

  return (
    <main className="relative overflow-x-clip pt-safe md:pt-6 pb-36 md:pb-16 flex flex-col gap-7 md:gap-9">
      <div
        aria-hidden="true"
        className="md:hidden absolute right-[-140px] top-[-160px] w-[480px] h-[360px] rounded-full opacity-30 blur-[80px] pointer-events-none"
        style={{ background: "radial-gradient(#B5C5FF, transparent 70%)" }}
      />
      {alert && <RoleAlertCard alert={alert} />}

      <HomeHeader />

      <nav aria-label="Quick actions" className="hscroll relative flex gap-2 px-5 md:px-0">
        <Chip href="/search" solid>Find bandmates</Chip>
        <Chip href="/discover/today">Today&apos;s musicians</Chip>
        <Chip href="/board">Gigs and sessions</Chip>
        <Chip href="/board/new">Post on the Board</Chip>
      </nav>

      {yourTurn > 0 && (
        <Link href="/messages" className="relative mx-5 md:mx-0 p-4 rounded-[22px] bg-stage border border-[#67E2DA]/40 flex items-center gap-3 transition hover:border-[#67E2DA]">
          <span className="size-2.5 rounded-full bg-[#67E2DA] shrink-0" aria-hidden="true" />
          <span className="flex-1 text-[15px] font-semibold">
            {yourTurn === 1 ? "A musician is waiting on your reply" : `${yourTurn} musicians are waiting on your reply`}
          </span>
          <span className="text-[14px] font-semibold text-[#67E2DA]">Reply</span>
        </Link>
      )}

      {/* Wide screens: your page on the left, the people near you beside it. */}
      <div className={stage ? "flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)] lg:gap-12 lg:items-start" : "contents"}>
      {stage && <YourStage stage={stage} />}

      <section aria-labelledby="near-you" className="relative flex flex-col gap-3 min-w-0">
        <div className="px-5 md:px-0 flex items-baseline justify-between gap-3">
          <h2 id="near-you" className="text-[19px] md:text-[22px] font-semibold tracking-[-0.01em]">
            {asked.length ? "Want to play with you" : "Musicians near you"}
          </h2>
          <Link href="/discover/today" className="text-[14px] font-semibold text-tungsten">
            See all
          </Link>
        </div>
        {people.length ? (
          <ul className="hscroll flex gap-2.5 md:gap-3.5 px-5 md:px-0 snap-x snap-mandatory scroll-px-5 md:scroll-px-0">
            {[...asked, ...people.filter((p) => !incoming.includes(p.id))].map((m, i) => (
              <li key={m.id} className="snap-start shrink-0 w-[158px] md:w-[210px]">
                <Link href={`/m/${m.username}`} className="group relative block h-[214px] md:h-[280px] rounded-[22px] overflow-hidden">
                  <PersonPhoto person={m} priority={i < 2} sizes="210px" initialsSize={48} className="object-[50%_30%] transition duration-500 group-hover:scale-[1.04]" />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(15_13_11/0.95))]" />
                  {(m.sample || incoming.includes(m.id)) && (
                    <span className="absolute left-2.5 top-2.5 glass h-6 px-2.5 rounded-full text-[11px] font-semibold flex items-center">
                      {incoming.includes(m.id) ? "Asked you" : "Sample"}
                    </span>
                  )}
                  <span className="absolute inset-x-3 bottom-3 flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-tungsten truncate">
                      {m.instrument} · {m.distanceMi ? `${m.distanceMi} mi` : m.neighborhood}
                    </span>
                    <span className="text-[17px] font-semibold truncate">{m.name}</span>
                    {m.lookingFor && <span className="text-[12px] text-paper/75 truncate">{m.lookingFor}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyCard title="You're early here" body="Musicians near you show up as they join. Share your page so the ones you know come first." />
        )}
      </section>
      </div>

      <section aria-labelledby="on-board" className="relative flex flex-col gap-3">
        <div className="px-5 md:px-0 flex items-baseline justify-between gap-3">
          <h2 id="on-board" className="text-[19px] md:text-[22px] font-semibold tracking-[-0.01em]">On the Board</h2>
          <Link href="/board" className="text-[14px] font-semibold text-tungsten">
            Open
          </Link>
        </div>
        {posts.length ? (
          <ul className="hscroll flex gap-3 md:gap-3.5 px-5 md:px-0 snap-x snap-mandatory scroll-px-5 md:scroll-px-0">
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
    </main>
  );
}

function Chip({ href, solid, children }: { href: string; solid?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        solid
          ? "shrink-0 h-10 px-4 rounded-full bg-paper text-ink text-[14px] font-semibold flex items-center whitespace-nowrap hover:bg-paper/90 transition"
          : "shrink-0 h-10 px-4 rounded-full bg-paper/10 border border-paper/10 text-[14px] font-semibold flex items-center whitespace-nowrap hover:bg-paper/16 transition"
      }
    >
      {children}
    </Link>
  );
}

function EmptyCard({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="mx-5 md:mx-0 p-5 rounded-[22px] bg-stage border border-paper/8 flex flex-col gap-2 items-start">
      <span className="text-[16px] font-semibold">{title}</span>
      <span className="text-[14px] text-smoke text-pretty">{body}</span>
      {href && cta && (
        <Link href={href} className="mt-1 h-10 px-4 rounded-full bg-paper text-ink text-[14px] font-semibold flex items-center">
          {cta}
        </Link>
      )}
    </div>
  );
}
