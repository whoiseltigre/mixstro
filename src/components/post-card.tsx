import Image from "next/image";
import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import type { BoardPost } from "@/lib/board";
import { COLOR, POST_KIND_GEL } from "@/lib/tokens";

const KIND_COLOR = POST_KIND_GEL;

/** A Board post as a card: on the Board's shelves and on Home. */
export function PostCard({ post: p }: { post: BoardPost }) {
  const color = KIND_COLOR[p.kind] ?? COLOR.tungsten;
  return (
    <Link href={`/board/${p.id}`} className="group block rounded-card-lg overflow-hidden bg-stage h-full transition hover:bg-riser">
      <div className="relative h-[140px] md:h-[160px] overflow-hidden">
        {p.photo ? (
          <Image src={p.photo} alt={p.alt ?? ""} fill sizes="300px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
            <PersonPhoto person={p.author} sizes="300px" initialsSize={44} />
          </div>
        )}
        <span className="absolute top-3 left-3 h-6 px-2.5 rounded-full text-caption2 font-bold tracking-[0.08em] uppercase text-ink flex items-center" style={{ background: color }}>
          {p.kind}
        </span>
        {p.isNew && !p.mine && <span className="absolute top-3 right-3 glass h-6 px-2.5 rounded-full text-caption2 font-semibold flex items-center">New</span>}
        {p.distanceMi !== undefined && (
          <span className="absolute bottom-3 right-3 glass h-6 px-2.5 rounded-full text-caption2 font-semibold flex items-center">{p.distanceMi} mi</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1">
        <span className="text-body font-semibold tracking-[-0.01em] leading-[1.25]">{p.title}</span>
        <span className="text-footnote text-smoke">{p.meta}</span>
        <span className={`text-footnote ${p.answered || (p.mine && p.replies) ? "text-tungsten font-semibold" : "text-smoke/80"}`}>{p.foot}</span>
      </div>
    </Link>
  );
}
