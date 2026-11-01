import Image from "next/image";
import Link from "next/link";
import { BOARD } from "@/lib/mock";

export const metadata = { title: "The Board · Mixstro" };

type Post = (typeof BOARD)[number];

// Shelves, like Apple Music's Browse: one row per kind of post, each with its own gel color.
const SHELVES: { title: string; sub: string; color: string; match: (p: Post) => boolean }[] = [
  { title: "New near you", sub: "Posted this week within 25 mi", color: "#FFB245", match: () => true },
  { title: "Bands looking for members", sub: "Open spots in bands and projects", color: "#B5C5FF", match: (p) => p.kind === "Band seeking" },
  { title: "Sessions and paid work", sub: "Studio days, subs and shows", color: "#67E2DA", match: (p) => p.kind === "Session" || /paid|\$/i.test(p.meta) },
  { title: "Collabs and co-writes", sub: "Writing, remote projects, just for fun", color: "#FFACBA", match: (p) => p.kind === "Collab" },
];

export default function Board() {
  const shelves = SHELVES.map((s) => ({
    ...s,
    posts: BOARD.filter(s.match).sort((a, b) => Number(b.isNew) - Number(a.isNew)),
  })).filter((s) => s.posts.length);

  return (
    <main className="pt-safe md:pt-6 pb-32 md:pb-16 flex flex-col gap-7 md:gap-9">
      <div className="mt-3 md:mt-0 px-5 md:px-0 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] md:text-[15px] font-medium text-smoke">Los Angeles · within 25 mi</span>
          <h1 className="headline text-[34px] md:text-[44px]">The Board</h1>
        </div>
        <button className="h-9 md:h-11 px-3.5 md:px-5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center gap-1.5 hover:bg-paper/90 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Post
        </button>
      </div>

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
                <Link href={`/m/${p.author}`} className="group block rounded-[22px] overflow-hidden bg-stage h-full transition hover:bg-riser">
                  <div className="relative h-[140px] md:h-[160px] overflow-hidden">
                    <Image src={p.photo} alt={p.alt} fill sizes="300px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                    <span
                      className="absolute top-3 left-3 h-6 px-2.5 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase text-ink flex items-center"
                      style={{ background: s.color }}
                    >
                      {p.kind}
                    </span>
                    {p.isNew && <span className="absolute top-3 right-3 glass h-6 px-2.5 rounded-full text-[11px] font-semibold flex items-center">New</span>}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-[16px] font-semibold tracking-[-0.01em] leading-[1.25]">{p.title}</span>
                    <span className="text-[13px] text-smoke">{p.meta}</span>
                    <span className="text-[13px] text-smoke/80">{p.foot}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
