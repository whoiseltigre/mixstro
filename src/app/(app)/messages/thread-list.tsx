"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PersonPhoto } from "@/components/person-photo";
import { TimeAgo } from "@/components/time-ago";
import { cx } from "@/components/ui";
import type { getThreads } from "@/lib/people";

type Thread = Awaited<ReturnType<typeof getThreads>>["threads"][number];

/** Your conversations. The whole screen on phones; the left pane beside the open chat from 768px. */
export function ThreadList({ threads }: { threads: Thread[] }) {
  const path = usePathname();
  return (
    <div className="pt-safe md:pt-5 px-5 md:px-3 pb-32 md:pb-4 flex flex-col gap-5 md:gap-3 md:h-full md:overflow-y-auto">
      <h1 className="mt-3 md:mt-0 md:px-2 headline text-[34px] md:text-[28px]">Messages</h1>
      {threads.length === 0 ? (
        <div className="pt-16 md:pt-8 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-semibold">No conversations yet</h2>
          <p className="max-w-[280px] text-[15px] leading-[1.5] text-smoke">
            When you and another musician both Connect, your chat opens here.
          </p>
          <Link href="/discover" className="mt-3 h-11 px-5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center">
            See Today
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col md:gap-1">
          {threads.map((t) => {
            const waiting = !t.mine;
            const open = path === `/messages/${t.username}`;
            return (
              <li key={t.username}>
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
                      <span className="text-[16px] font-semibold">{t.person.name}</span>
                      <TimeAgo iso={t.at} className="text-[13px] text-smoke" />
                    </div>
                    <span className={`text-[14px] truncate ${waiting ? "text-paper" : "text-smoke"}`}>
                      {t.mine ? `You: ${t.preview}` : t.preview}
                    </span>
                  </div>
                  {waiting && <span className="size-2.5 rounded-full bg-tungsten shrink-0" aria-label="Your turn" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Phones show either the list or a chat; from 768px both sit side by side in one glass panel. */
export function MessagesShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const inChat = usePathname() !== "/messages";
  return (
    <div className="md:mt-2 md:mb-6 md:h-[calc(100dvh-88px-32px)] md:grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] md:rounded-[28px] md:overflow-hidden md:border md:border-paper/8 md:bg-stage/55 md:backdrop-blur-xl">
      <aside className={cx("md:border-r md:border-paper/8 md:min-h-0", inChat ? "hidden md:block" : "block")}>{list}</aside>
      <section className={cx("md:min-h-0 md:relative", inChat ? "block" : "hidden md:block")}>{children}</section>
    </div>
  );
}
