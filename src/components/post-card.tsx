import Link from "next/link";
import { InstrumentIcon } from "@/components/instrument-icon";
import { PersonPhoto } from "@/components/person-photo";
import type { BoardPost } from "@/lib/board";
import { familyOf, nounFor } from "@/lib/instruments";
import { COLOR, POST_KIND_GEL } from "@/lib/tokens";

const KIND_COLOR = POST_KIND_GEL;

/** Who the post is looking for, as an instrument family ("Drums"), from its role or its title. */
const TITLE_HINTS: [RegExp, string][] = [
  [/drum|percussion/i, "Drums"],
  [/bass/i, "Bass"],
  [/guitar/i, "Guitar"],
  [/sing|vocal|rapper|mc\b/i, "Vocals"],
  [/keys|piano|synth|organ/i, "Keys"],
  [/violin|cello|fiddle|strings/i, "Strings"],
  [/sax|trumpet|horn|flute|trombone/i, "Horns"],
  [/produc|mix|engineer|beat/i, "Producer"],
  [/writ|lyric|compos/i, "Songwriter"],
  [/\bdj\b/i, "DJ"],
];
export function wantedFamily(p: Pick<BoardPost, "role" | "title" | "opening">): string | undefined {
  const named = p.opening?.neededRole ?? p.role;
  const direct = named ? familyOf(named)?.id : undefined;
  if (direct) return direct;
  const text = `${named ?? ""} ${p.title}`;
  return TITLE_HINTS.find(([re]) => re.test(text))?.[1];
}

/**
 * The cover of a Board post. A post is an empty spot on a stage, so the cover is never a photo
 * of the person who posted it. Three looks, switched by data-covers on <html> (try them on /design):
 *   A · Spotlight (default): the wanted instrument standing in a beam of the post's gel color.
 *   B · Record: the blog's record art, pressed in the post's gel color.
 *   C · Flyer: the wanted role set big on colored paper, like a flyer on a rehearsal-room wall.
 */
export function PostCover({ post: p, className = "" }: { post: BoardPost; className?: string }) {
  const color = KIND_COLOR[p.kind] ?? COLOR.tungsten;
  const family = wantedFamily(p);
  const word = family ? nounFor(family) : p.kind === "Collab" ? "co-writer" : p.kind === "Session" ? "session" : "musician";
  return (
    <div className={`post-cover relative overflow-hidden ${className}`} style={{ "--c": color } as React.CSSProperties}>
      {/* A · Spotlight */}
      <div aria-hidden="true" className="cover-a absolute inset-0 transition duration-500 group-hover:scale-[1.03]">
        <span className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--c) 34%, var(--color-ink)), color-mix(in srgb, var(--c) 10%, var(--color-ink)) 78%)" }} />
        {/* Two beams from the rig, crossing where the missing player would stand. */}
        <span className="absolute inset-0 mix-blend-screen" style={{ background: "conic-gradient(from 168deg at 30% -18%, transparent 0deg, color-mix(in srgb, var(--c) 78%, transparent) 9deg, transparent 21deg), conic-gradient(from 176deg at 74% -18%, transparent 0deg, color-mix(in srgb, var(--c) 62%, transparent) 10deg, transparent 22deg)" }} />
        <span className="absolute left-1/2 -translate-x-1/2 bottom-[-34px] w-[70%] h-[64px] rounded-[50%] blur-[14px]" style={{ background: "color-mix(in srgb, var(--c) 70%, transparent)" }} />
        <span className="absolute inset-0 flex items-center justify-center text-paper drop-shadow-[0_6px_18px_rgb(0_0_0/0.45)]">
          <InstrumentIcon family={family ?? ""} size={64} />
        </span>
      </div>
      {/* B · Record */}
      <div aria-hidden="true" className="cover-b absolute inset-0 transition duration-700 group-hover:rotate-[4deg] group-hover:scale-[1.05]">
        <span className="absolute inset-0" style={{ background: "linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 55%, var(--color-gel-pink)) 60%, color-mix(in srgb, var(--c) 40%, var(--color-gel-peach)))" }} />
        <span className="absolute inset-0" style={{ background: "repeating-radial-gradient(circle at 78% 58%, transparent 0 9px, rgb(15 13 11 / 0.2) 9px 10.5px)" }} />
        <span className="absolute size-[54px] rounded-full bg-ink flex items-center justify-center text-paper" style={{ left: "calc(78% - 27px)", top: "calc(58% - 27px)" }}>
          <InstrumentIcon family={family ?? ""} size={26} />
        </span>
      </div>
      {/* C · Flyer */}
      <div aria-hidden="true" className="cover-c absolute inset-0">
        <span className="absolute inset-0" style={{ background: "var(--c)" }} />
        <span className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 100% 100%, rgb(15 13 11 / 0.22), transparent 60%)" }} />
        <span className="absolute left-1/2 -translate-x-1/2 top-2 size-3 rounded-full bg-ink/80 shadow-[0_2px_0_rgb(0_0_0/0.25)]" />
        <span className="absolute inset-x-4 top-7 flex flex-col gap-1 text-ink">
          <span className="text-caption font-semibold tracking-[0.14em] uppercase opacity-70">{p.kind} · wanted</span>
          <span className="headline text-display-sm uppercase leading-[0.95] break-words">{word}</span>
        </span>
      </div>
    </div>
  );
}

/** A Board post as a card: on the Board's shelves and on Home. */
export function PostCard({ post: p }: { post: BoardPost }) {
  const color = KIND_COLOR[p.kind] ?? COLOR.tungsten;
  return (
    <Link href={`/board/${p.id}`} className="group press-card block rounded-card-lg overflow-hidden bg-stage h-full transition-colors hover:bg-riser">
      <div className="relative">
        <PostCover post={p} className="h-[150px] md:h-[170px]" />
        <span className="post-cover-chip absolute top-3 left-3 h-7 px-2.5 rounded-full text-caption font-semibold tracking-[0.06em] uppercase text-ink flex items-center" style={{ background: color }}>
          {p.kind}
        </span>
        {p.isNew && !p.mine && <span className="absolute top-3 right-3 glass-thick h-7 px-2.5 rounded-full text-caption font-semibold flex items-center">New</span>}
        <span className="absolute left-3 bottom-3 glass-thick h-8 pl-1 pr-3 rounded-full flex items-center gap-2 min-w-0 max-w-[62%]">
          <span className="relative size-6 rounded-full overflow-hidden shrink-0">
            <PersonPhoto person={p.author} sizes="24px" initialsSize={10} />
          </span>
          <span className="text-footnote text-paper truncate">{p.mine ? "You" : p.author.name.split(" ")[0]}</span>
        </span>
        {p.distanceMi !== undefined && <span className="absolute bottom-3 right-3 glass-thick h-8 px-2.5 rounded-full text-footnote font-medium flex items-center tabular-nums">{p.distanceMi} mi</span>}
      </div>
      <div className="p-4 flex flex-col gap-1">
        <span className="text-body-lg font-semibold tracking-[-0.01em] leading-[1.25]">{p.title}</span>
        <span className="text-footnote text-smoke">{p.meta}</span>
        <span className={`text-footnote ${p.answered || (p.mine && p.replies) ? "text-gel-blue font-semibold" : "text-smoke"}`}>{p.foot}</span>
      </div>
    </Link>
  );
}
