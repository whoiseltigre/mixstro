import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import { TimeAgo } from "@/components/time-ago";
import { getThreads } from "@/lib/people";

export const metadata = { title: "Messages · Mixstro" };
export const dynamic = "force-dynamic";

export default async function Messages() {
  const { threads } = await getThreads();
  return (
    <main className="pt-safe px-5 pb-32 flex flex-col gap-5">
      <h1 className="mt-3 headline text-[34px]">Messages</h1>
      {threads.length === 0 ? (
        <div className="pt-16 flex flex-col items-center gap-2 text-center">
          <h2 className="text-[20px] font-semibold">No conversations yet</h2>
          <p className="max-w-[280px] text-[15px] leading-[1.5] text-smoke">
            When you and another musician both Connect, your chat opens here.
          </p>
          <Link href="/discover" className="mt-3 h-11 px-5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center">
            See Today
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col">
          {threads.map((t) => {
            const waiting = !t.mine;
            return (
              <li key={t.username}>
                <Link href={`/messages/${t.username}`} className="flex items-center gap-3.5 py-3 border-b border-paper/8">
                  <div className="relative size-14 rounded-full overflow-hidden shrink-0">
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
    </main>
  );
}
