import Link from "next/link";
import { ConnectButton } from "../../m/[username]/connect-button";
import { PersonPhoto } from "@/components/person-photo";
import { BackButton, ButtonLink, ChevronRight } from "@/components/ui";
import { getNetwork } from "@/lib/network";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your network" };

/** Your connections, and people you may know through your bands and your connections. */
export default async function NetworkPage() {
  const { connections, suggestions } = await getNetwork();
  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-7 md:max-w-[760px] md:mx-auto">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/me" />
        <h1 className="headline text-[28px]">Your network</h1>
      </header>

      {suggestions.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold">People you may know</h2>
            <p className="text-[13px] text-smoke">From your bands and the people you&apos;re connected with.</p>
          </div>
          <div className="hscroll flex gap-3 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-3">
            {suggestions.map(({ person: p, reason }) => (
              <article key={p.id} className="w-[220px] md:w-auto shrink-0 flex flex-col rounded-[22px] bg-stage border border-paper/8 overflow-hidden">
                <Link href={`/m/${p.username}`} className="relative block h-[150px]">
                  <PersonPhoto person={p} sizes="220px" initialsSize={44} />
                  <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-stage/0 to-stage" />
                </Link>
                <div className="flex-1 flex flex-col gap-3 p-4 pt-1">
                  <Link href={`/m/${p.username}`} className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-semibold">{p.name.split(" ")[0]}</span>
                    <span className="text-[13px] text-smoke">{p.instrument} · {p.neighborhood}</span>
                  </Link>
                  <p className="text-[13px] leading-snug text-tungsten flex-1">{reason}</p>
                  {p.sample ? (
                    <ButtonLink href={`/m/${p.username}`} variant="glass" className="h-10 text-[14px]">View profile</ButtonLink>
                  ) : (
                    <ConnectButton id={p.id} username={p.username} firstName={p.name} label="Connect" className="h-10 text-[14px]" />
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">Connections</h2>
          <span className="text-[13px] text-smoke">{connections.length}</span>
        </div>
        {connections.length ? (
          <ul className="flex flex-col gap-2 md:grid md:grid-cols-2">
            {connections.map((m) => (
              <li key={m.id}>
                <Link href={`/m/${m.username}`} className="flex items-center gap-3 p-3 rounded-[18px] bg-stage border border-paper/8 transition hover:border-paper/40">
                  <span className="relative size-12 rounded-full overflow-hidden shrink-0">
                    <PersonPhoto person={m} sizes="48px" initialsSize={18} />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[15px] font-semibold truncate">{m.name.split(" ")[0]}</span>
                    <span className="text-[13px] text-smoke truncate">{m.instrument} · {m.neighborhood}</span>
                  </span>
                  <ChevronRight />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-3 p-5 rounded-[22px] border border-dashed border-paper/20">
            <p className="text-[15px] text-smoke text-pretty">
              Nobody yet. When someone says yes to your Connect, they show up here, and so do the people you know through them.
            </p>
            <ButtonLink href="/discover" variant="glass" className="h-11 text-[15px] self-start px-5">Find musicians</ButtonLink>
          </div>
        )}
      </section>
    </main>
  );
}
