import Image from "next/image";
import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import { getBoard, type BoardPost } from "@/lib/board";

export const metadata = { title: "The Board · Mixstro" };
export const dynamic = "force-dynamic";

// Shelves, like Apple Music's Browse: one row per kind of post, each with its own gel color.
const SHELVES: { title: string; sub: string; color: string; match: (p: BoardPost) => boolean }[] = [
  { title: "Your posts", sub: "See who answered", color: "#F5F1EC", match: (p) => p.mine },
  { title: "New near you", sub: "Posted this week", color: "#FFB245", match: (p) => !p.mine && p.isNew },
  { title: "Bands looking for members", sub: "Open spots in bands and projects", color: "#B5C5FF", match: (p) => !p.mine && p.kind === "Band seeking" },
  { title: "Sessions and paid work", sub: "Studio days, subs and shows", color: "#67E2DA", match: (p) => !p.mine && (p.kind === "Session" || p.paid) },
  { title: "Collabs and co-writes", sub: "Writing, remote projects, just for fun", color: "#FFACBA", match: (p) => !p.mine && p.kind === "Collab" },
];

const KIND_COLOR: Record<string, string> = { "Band seeking": "#B5C5FF", Session: "#67E2DA", Collab: "#FFACBA" };

export default async function Board() {
  const { posts, area } = await getBoard();
  const shelves = SHELVES.map((s) => ({ ...s, posts: posts.filter(s.match) })).filter((s) => s.posts.length);

  return (
    <main className="pt-safe md:pt-6 pb-32 md:pb-16 flex flex-col gap-7 md:gap-9">
      <div className="mt-3 md:mt-0 px-5 md:px-0 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] md:text-[15px] font-medium text-smoke">{area}</span>
          <h1 className="headline text-[34px] md:text-[44px]">The Board</h1>
        </div>
        <Link
          href="/board/new"
          className="h-9 md:h-11 px-3.5 md:px-5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center gap-1.5 hover:bg-paper/90 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Post
        </Link>
      </div>

      {shelves.length === 0 && (
        <section className="mx-5 md:mx-0 rounded-[24px] bg-stage p-6 md:p-8 flex flex-col gap-3 items-start" style={{ background: "radial-gradient(120% 140% at 0% 0%, rgb(255 178 69 / 0.18), transparent 60%), var(--color-stage)" }}>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]">Nothing posted near you yet</h2>
          <p className="text-[15px] text-smoke max-w-[460px]">
            Need a drummer, a sub for Saturday, or someone to write with? Post it and musicians nearby answer with their profile.
          </p>
          <Link href="/board/new" className="mt-1 h-11 px-5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center">
            Post the first one
          </Link>
        </section>
      )}

      {shelves.map((s) => (
        <section key={s.title} aria-labelledby={`shelf-${s.color}`} className="flex flex-col gap-3">
          <div className="px-5 md:px-0 flex items-center gap-2.5">
            <span className="size-2.5 rounded-full shrink-0" style={{ background: s.color }} aria-hidden="true" />
            <h2 id={`shelf-${s.color}`} className="text-[18px] md:text-[20px] font-semibold tracking-[-0.01em]">{s.title}</h2>
            <span className="hidden md:inline text-[14px] text-smoke">{s.sub}</span>
          </div>
          <ul className="hscroll flex gap-3 md:gap-3.5 px-5 md:px-0 snap-x snap-mandatory scroll-px-5 md:scroll-px-0">
            {s.posts.map((p) => (
              <li key={p.id} className="snap-start shrink-0 w-[250px] md:w-[300px]">
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function PostCard({ post: p }: { post: BoardPost }) {
  const color = KIND_COLOR[p.kind] ?? "#FFB245";
  return (
    <Link href={`/board/${p.id}`} className="group block rounded-[22px] overflow-hidden bg-stage h-full transition hover:bg-riser">
      <div className="relative h-[140px] md:h-[160px] overflow-hidden">
        {p.photo ? (
          <Image src={p.photo} alt={p.alt ?? ""} fill sizes="300px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.04]">
            <PersonPhoto person={p.author} sizes="300px" initialsSize={44} />
          </div>
        )}
        <span className="absolute top-3 left-3 h-6 px-2.5 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase text-ink flex items-center" style={{ background: color }}>
          {p.kind}
        </span>
        {p.isNew && !p.mine && <span className="absolute top-3 right-3 glass h-6 px-2.5 rounded-full text-[11px] font-semibold flex items-center">New</span>}
        {p.distanceMi !== undefined && (
          <span className="absolute bottom-3 right-3 glass h-6 px-2.5 rounded-full text-[11px] font-semibold flex items-center">{p.distanceMi} mi</span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1">
        <span className="text-[16px] font-semibold tracking-[-0.01em] leading-[1.25]">{p.title}</span>
        <span className="text-[13px] text-smoke">{p.meta}</span>
        <span className={`text-[13px] ${p.answered || (p.mine && p.replies) ? "text-tungsten font-semibold" : "text-smoke/80"}`}>{p.foot}</span>
      </div>
    </Link>
  );
}
