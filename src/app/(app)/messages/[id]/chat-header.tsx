import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import { SafetyMenu } from "@/components/safety-menu";
import { BackButton } from "@/components/ui";
import type { Musician } from "@/lib/mock";

export function ChatHeader({ person: m, action = true }: { person: Musician; action?: boolean }) {
  return (
    <header className="glass rounded-b-[26px] md:rounded-none md:bg-transparent md:backdrop-blur-none md:border-x-0 md:border-b md:border-paper/8 border-t-0 pt-safe md:pt-3 px-3.5 md:px-5 pb-3 flex items-center gap-2.5 z-10">
      <span className="md:hidden">
        <BackButton href="/messages" />
      </span>
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
      {!m.sample && <SafetyMenu username={m.username} name={m.name} />}
    </header>
  );
}
