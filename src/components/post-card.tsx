import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import type { BoardPost } from "@/lib/board";
import { COLOR, POST_KIND_GEL } from "@/lib/tokens";

const KIND_COLOR = POST_KIND_GEL;
const KIND_ICON: Record<string, React.ReactNode> = {
  "Band seeking": (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c.7-3 3.1-4.8 6-4.8s5.3 1.8 6 4.8M18 8v6M15 11h6" />
    </>
  ),
  Session: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
    </>
  ),
  Collab: (
    <>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
};

/** A Board post as a card: on the Board's shelves and on Home. */
export function PostCard({ post: p }: { post: BoardPost }) {
  const color = KIND_COLOR[p.kind] ?? COLOR.tungsten;
  return (
    <Link href={`/board/${p.id}`} className="group block rounded-card-lg overflow-hidden bg-stage h-full transition hover:bg-riser">
      <div className="relative h-[140px] md:h-[160px] overflow-hidden">
        {/* A lit cover in the post's own color, never a photo: photos belong to people, so a post
            never looks like a second copy of its author's profile. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]"
          style={{
            background: `radial-gradient(90% 120% at 85% -10%, color-mix(in srgb, ${color} 55%, transparent), transparent 62%), radial-gradient(70% 90% at 0% 110%, color-mix(in srgb, ${color} 22%, transparent), transparent 70%), var(--color-riser)`,
          }}
        />
        <svg aria-hidden="true" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke={color} strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="absolute -right-2 top-6">
          {KIND_ICON[p.kind] ?? KIND_ICON["Band seeking"]}
        </svg>
        <span className="absolute left-3 bottom-3 flex items-center gap-2 min-w-0 max-w-[70%]">
          <span className="relative size-7 rounded-full overflow-hidden shrink-0 ring-2 ring-ink/40">
            <PersonPhoto person={p.author} sizes="28px" initialsSize={11} />
          </span>
          <span className="text-footnote text-paper/90 truncate">
            {p.mine ? "You" : p.author.name.split(" ")[0]} · {p.author.instrument}
          </span>
        </span>
        <span className="absolute top-3 left-3 h-6 px-2.5 rounded-full text-caption2 font-semibold tracking-[0.08em] uppercase text-ink flex items-center" style={{ background: color }}>
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
