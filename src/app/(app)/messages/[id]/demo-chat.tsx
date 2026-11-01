import { ChatHeader } from "./chat-header";
import type { Musician } from "@/lib/mock";

const BARS = [6, 12, 18, 10, 20, 16, 8, 14, 20, 12, 8, 17, 19, 11, 7, 15, 18, 10, 13, 20, 11, 16, 9, 14];

/** The sample conversation shown in demo mode, with a voice note and a jam invite. */
export function DemoChat({ person: m }: { person: Musician }) {
  const first = m.name.split(" ")[0];

  return (
    <main className="relative h-dvh md:h-full flex flex-col">
      <ChatHeader person={m} />

      <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-[90px] flex flex-col justify-end gap-2">
        <div className="self-center text-[12px] text-smoke py-1">Connected today · 7:42 PM</div>
        <div className="self-end w-[236px] flex items-center gap-2.5 px-3 py-2.5 rounded-[20px_20px_6px_20px] bg-paper text-ink">
          <button aria-label="Play your voice note" className="size-8 rounded-full bg-ink text-paper flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
          </button>
          <div aria-hidden="true" className="flex-1 flex items-center gap-0.5 h-[22px]">
            {BARS.map((h, i) => <span key={i} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />)}
          </div>
          <span className="text-[12px] font-medium">0:31</span>
        </div>
        <div className="self-start max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_20px_6px] bg-stage text-[15px] leading-[1.4]">Ha, that riff is very Big Thief. I love it.</div>
        <div className="self-start max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_20px_6px] bg-stage text-[15px] leading-[1.4]">We have a rehearsal space in Silver Lake. Want to come play Thursday?</div>
        <div className="self-start w-[260px] rounded-[20px] bg-stage p-3 flex flex-col gap-2.5 border border-paper/10">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB245" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
            <span className="text-[14px] font-semibold">Jam session</span>
          </div>
          <span className="text-[14px] text-smoke">Thu · 7:00 PM · Silver Lake</span>
          <div className="flex gap-2">
            <button className="flex-1 h-9 rounded-full bg-paper text-ink text-[14px] font-semibold">I&apos;m in</button>
            <button className="flex-1 h-9 rounded-full border border-paper/20 text-[14px]">Suggest time</button>
          </div>
        </div>
      </div>

      <form className="glass fixed md:absolute z-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4 md:right-4 w-[calc(min(100%,440px)-24px)] md:w-auto bottom-[max(env(safe-area-inset-bottom),16px)] md:bottom-4 h-[54px] rounded-[27px] flex items-center gap-2 px-[7px]">
        <button type="button" aria-label="Attach a clip" className="size-10 rounded-full bg-riser flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" placeholder={`Message ${first}`} className="flex-1 h-10 bg-transparent text-[16px] outline-none placeholder:text-smoke" />
        <button type="button" aria-label="Record voice note" className="size-10 rounded-full bg-paper text-ink flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
        </button>
      </form>
    </main>
  );
}
