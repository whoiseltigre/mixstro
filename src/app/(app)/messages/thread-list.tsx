"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PersonPhoto } from "@/components/person-photo";
import { TimeAgo } from "@/components/time-ago";
import { cx } from "@/components/ui";
import type { getThreads } from "@/lib/people";
import type { MyBand } from "@/lib/band-hub";
import { FadeImg } from "@/components/fade-image";
import { nameWash } from "@/lib/projects";

type Thread = Awaited<ReturnType<typeof getThreads>>["threads"][number];

/** Your conversations. The whole screen on phones; the left pane beside the open chat from 768px. */
export function ThreadList({ threads, bands = [] }: { threads: Thread[]; bands?: MyBand[] }) {
  const path = usePathname();
  return (
    <div className="pt-safe md:pt-5 px-5 md:px-3 pb-32 md:pb-4 flex flex-col gap-5 md:gap-3 md:h-full md:overflow-y-auto">
      <h1 className="mt-3 md:mt-0 md:px-2 headline text-display md:text-title-lg">Messages</h1>
      {bands.length > 0 && <BandThreads bands={bands} path={path} />}
      {threads.length === 0 ? (
        <div className="pt-16 md:pt-8 flex flex-col items-center gap-2 text-center">
          <h2 className="text-title3 font-semibold">No conversations yet</h2>
          <p className="max-w-[280px] text-callout leading-[1.5] text-smoke">When you and another musician both Connect, your chat opens here.</p>
          <Link href="/discover" className="mt-3 h-11 px-5 rounded-full bg-paper text-ink text-callout font-semibold flex items-center">
            See Today
          </Link>
        </div>
      ) : (
        <>
          {threads.some((t) => t.yourTurn) && (
            <p className="md:px-2 -mb-2 text-footnote font-semibold text-gel-teal">Your turn · {threads.filter((t) => t.yourTurn).length} waiting on you</p>
          )}
          <ul className="stagger flex flex-col md:gap-1">
            {[...threads.filter((t) => t.yourTurn), ...threads.filter((t) => !t.yourTurn)].map((t, i, all) => {
              const waiting = Boolean(t.yourTurn);
              const divider = i > 0 && all[i - 1].yourTurn && !t.yourTurn;
              const open = path === `/messages/${t.username}`;
              return (
                <li key={t.username} className={divider ? "mt-4 md:mt-3" : undefined}>
                  <Link
                    href={`/messages/${t.username}`}
                    aria-current={open ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-3.5 py-3 border-b border-paper/8 md:border-0 md:px-2.5 md:rounded-2xl transition",
                      open ? "md:bg-paper/10" : "md:hover:bg-paper/5",
                    )}
                  >
                    <div className="relative size-14 md:size-12 rounded-full overflow-hidden shrink-0">
                      <PersonPhoto person={t.person} sizes="56px" initialsSize={20} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-body font-semibold">
                          {t.person.name}
                          {t.person.sample && <span className="ml-2 align-middle inline-flex h-5 px-2 rounded-full bg-paper/10 text-caption font-semibold text-smoke">Example</span>}
                        </span>
                        <TimeAgo iso={t.at} className="text-footnote text-smoke" />
                      </div>
                      <span className={`text-subhead truncate ${waiting ? "text-paper" : "text-smoke"}`}>{t.mine ? `You: ${t.preview}` : t.preview}</span>
                    </div>
                    {waiting && <span className="size-2.5 rounded-full bg-gel-teal shrink-0" aria-label="Your turn" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/** Your band chats, above your one-to-one chats. */
function BandThreads({ bands, path }: { bands: MyBand[]; path: string }) {
  return (
    <section aria-label="Band chats" className="flex flex-col gap-1">
      <h2 className="md:px-2 text-footnote font-semibold text-smoke">{bands.length === 1 ? "Your band" : "Your bands"}</h2>
      <ul className="stagger flex flex-col md:gap-1">
        {bands.map((b) => {
          const href = `/messages/b/${b.id}`;
          const open = path === href;
          return (
            <li key={b.id}>
              <Link
                href={href}
                aria-current={open ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3.5 py-3 border-b border-paper/8 md:border-0 md:px-2.5 md:rounded-2xl transition",
                  open ? "md:bg-paper/10" : "md:hover:bg-paper/5",
                )}
              >
                <span className="relative size-14 md:size-12 rounded-tile md:rounded-field overflow-hidden shrink-0" style={{ background: nameWash(b.name) }}>
                  {b.photo && <FadeImg src={b.photo} alt="" className="absolute inset-0 size-full object-cover" />}
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="flex justify-between gap-2">
                    <span className="text-body font-semibold truncate">{b.name}</span>
                    {b.at && <TimeAgo iso={b.at} className="text-footnote text-smoke shrink-0" />}
                  </span>
                  <span className={`text-subhead truncate ${b.unread ? "text-paper" : "text-smoke"}`}>{b.preview}</span>
                </span>
                {b.unread > 0 && (
                  <span className="min-w-6 h-6 px-2 rounded-full bg-paper text-ink text-caption font-bold flex items-center justify-center shrink-0" aria-label={`${b.unread} unread`}>
                    {b.unread}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Phones show either the list or a chat; from 768px both sit side by side in one glass panel. */
export function MessagesShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const inChat = usePathname() !== "/messages";
  return (
    <div className="md:mt-2 md:mb-6 md:h-[calc(100dvh-88px-32px)] md:grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] md:rounded-sheet md:overflow-hidden md:border md:border-paper/8 md:bg-stage/55 md:backdrop-blur-xl">
      <aside className={cx("md:border-r md:border-paper/8 md:min-h-0", inChat ? "hidden md:block" : "block")}>{list}</aside>
      <section className={cx("md:min-h-0 md:relative", inChat ? "block" : "hidden md:block")}>{children}</section>
    </div>
  );
}
