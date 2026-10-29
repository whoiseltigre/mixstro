import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import { BackButton } from "@/components/ui";
import type { Musician } from "@/lib/mock";

export function ChatHeader({ person: m, action = true }: { person: Musician; action?: boolean }) {
  return (
    <header className="glass rounded-b-[26px] border-t-0 pt-safe px-3.5 pb-3 flex items-center gap-2.5 z-10">
      <BackButton href="/messages" />
      <div className="relative size-10 rounded-full overflow-hidden shrink-0">
        <PersonPhoto person={m} sizes="40px" initialsSize={15} />
      </div>
      <Link href={`/m/${m.username}`} className="flex-1 flex flex-col">
        <span className="text-[16px] font-semibold">{m.name}</span>
        <span className="text-[12px] text-smoke">
          {m.instrument}
          {m.shared.length ? ` · ${m.shared.length} shared influence${m.shared.length === 1 ? "" : "s"}` : ""}
        </span>
      </Link>
      {action && <button className="glass h-[34px] px-3 rounded-full text-[13px] font-semibold">Plan a jam</button>}
    </header>
  );
}
