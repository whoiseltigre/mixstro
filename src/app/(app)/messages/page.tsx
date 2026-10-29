import Image from "next/image";
import Link from "next/link";
import { THREADS, findMusician } from "@/lib/mock";

export const metadata = { title: "Messages · Mixstro" };

export default function Messages() {
  return (
    <main className="pt-safe px-5 pb-32 flex flex-col gap-5">
      <h1 className="mt-3 headline text-[34px]">Messages</h1>
      <ul className="flex flex-col">
        {THREADS.map((t) => {
          const m = findMusician(t.with)!;
          return (
            <li key={t.id}>
              <Link href={`/messages/${t.id}`} className="flex items-center gap-3.5 py-3 border-b border-paper/8">
                <div className="relative size-14 rounded-full overflow-hidden shrink-0">
                  <Image src={m.photo} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-[16px] font-semibold">{m.name}</span>
                    <span className="text-[13px] text-smoke">{t.time}</span>
                  </div>
                  <span className={`text-[14px] truncate ${t.unread ? "text-paper" : "text-smoke"}`}>{t.preview}</span>
                </div>
                {t.unread && <span className="size-2.5 rounded-full bg-tungsten shrink-0" aria-label="Unread" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
