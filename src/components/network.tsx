import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import type { Mutual } from "@/lib/network";

/** "Maya and 2 more you both know", with their photos overlapping. */
export function MutualsRow({ mutuals, first }: { mutuals: Mutual[]; first: string }) {
  if (!mutuals.length) return null;
  const [lead] = mutuals;
  const rest = mutuals.length - 1;
  return (
    <Link href={`/m/${lead.username}`} className="self-start flex items-center gap-2.5 text-[14px] text-smoke hover:text-paper transition">
      <span className="flex -space-x-2" aria-hidden="true">
        {mutuals.slice(0, 3).map((m) => (
          <span key={m.username} className="relative size-7 rounded-full overflow-hidden ring-2 ring-ink">
            <PersonPhoto person={{ id: m.username, name: m.name, photo: m.photo, photoAlt: "" }} sizes="28px" initialsSize={11} />
          </span>
        ))}
      </span>
      <span>
        You and {first} both know <span className="font-semibold text-paper">{lead.name}</span>
        {rest > 0 && ` and ${rest} more`}
      </span>
    </Link>
  );
}
