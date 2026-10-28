import Image from "next/image";
import Link from "next/link";
import { ArtistAvatar } from "@/components/artist-avatar";
import { LogoMark } from "@/components/ui";
import { MUSICIANS } from "@/lib/mock";

export const metadata = { title: "Discover · Mixstro" };

export default function Discover() {
  const m = MUSICIANS[0];
  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[71%]">
        <Image src={m.photo} alt={m.photoAlt} fill priority sizes="440px" className="object-cover object-[50%_30%]" />
      </div>
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/70 to-transparent" />
      <div className="absolute inset-x-0 top-[38%] h-[36%] bg-gradient-to-b from-ink/0 via-ink/85 to-ink" />
      <div className="absolute inset-x-0 top-[74%] bottom-0 bg-ink" />

      <header className="absolute inset-x-5 top-0 pt-safe mt-2 flex items-center justify-between">
        <LogoMark size={24} />
        <span className="glass h-8 px-3 rounded-full flex items-center text-[13px] font-semibold">1 of 5 today</span>
      </header>

      <div className="absolute inset-x-0 bottom-0 pb-[calc(max(env(safe-area-inset-bottom),16px)+96px)] flex flex-col gap-6">
        <div className="px-5 flex flex-col gap-2">
          <span className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.16em] uppercase">
            <span className="size-2 rounded-full bg-tungsten" />
            {m.instrument} · {m.genres} · {m.distanceMi} mi
          </span>
          <h1 className="headline text-[52px] leading-[0.95]">
            <Link href={`/m/${m.username}`}>{m.name}</Link>
          </h1>
        </div>

        <section aria-label="Influence overlap" className="glass mx-4 rounded-[24px] py-3.5 flex flex-col gap-2.5 overflow-hidden">
          <div className="px-4 flex items-baseline justify-between gap-2">
            <span className="text-[16px] font-semibold">{m.shared.length} shared influences</span>
            <span className="text-[13px] text-smoke">{m.commitment}, like you</span>
          </div>
          <div className="hscroll flex gap-1.5 px-4">
            {m.shared.map((a) => (
              <span key={a.id} className="shrink-0 flex items-center gap-2 h-8 pl-1 pr-3 rounded-full bg-paper/8 border border-paper/12 text-[13px] whitespace-nowrap">
                <ArtistAvatar artist={a} size={24} />
                {a.name}
              </span>
            ))}
          </div>
        </section>

        <div className="px-5 flex items-center gap-3">
          <button aria-label={`Play ${m.name.split(" ")[0]}'s clip`} className="glass size-[54px] rounded-full flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
          </button>
          <div className="gel-rim rounded-full flex-1">
            <Link href={`/connected/${m.username}`} className="h-[51px] rounded-full bg-paper text-ink text-[17px] font-semibold flex items-center justify-center">
              Connect
            </Link>
          </div>
          <button aria-label="Pass" className="glass size-[54px] rounded-full flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
    </main>
  );
}
