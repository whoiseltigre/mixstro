import Image from "next/image";
import Link from "next/link";
import { BOARD } from "@/lib/mock";

export const metadata = { title: "The Board · Mixstro" };

const FILTERS = ["For you", "Bands", "Sessions", "Paid"];

export default function Board() {
  return (
    <main className="pt-safe px-5 pb-32 flex flex-col gap-[18px]">
      <div className="mt-3 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-smoke">Los Angeles · within 25 mi</span>
          <h1 className="headline text-[34px]">The Board</h1>
        </div>
        <button className="h-9 px-3.5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Post
        </button>
      </div>

      <div role="tablist" aria-label="Filter posts" className="hscroll flex gap-2 -mx-5 px-5">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            role="tab"
            aria-selected={i === 0}
            className={`h-[34px] px-3.5 rounded-full text-[14px] shrink-0 ${i === 0 ? "bg-paper text-ink font-semibold" : "border border-paper/16"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {BOARD.map((p) => (
          <li key={p.id}>
            <Link href={`/m/${p.author}`} className="flex gap-3.5 p-3 rounded-[22px] bg-stage">
              <div className="relative w-[72px] h-[88px] rounded-[14px] overflow-hidden shrink-0">
                <Image src={p.photo} alt={p.alt} fill sizes="72px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[13px] font-medium text-smoke">{p.kind}</span>
                  {p.isNew && <span className="text-[12px] font-semibold text-tungsten">New</span>}
                </div>
                <span className="text-[17px] font-semibold tracking-[-0.01em] leading-[1.25]">{p.title}</span>
                <span className="text-[13px] text-smoke">{p.meta}</span>
                <span className="text-[13px] text-smoke">{p.foot}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
