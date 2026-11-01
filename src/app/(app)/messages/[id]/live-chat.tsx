"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { TimeAgo } from "@/components/time-ago";
import type { Musician } from "@/lib/mock";
import type { ChatMessage } from "@/lib/people";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "../../actions";
import { ChatHeader } from "./chat-header";

/** A real conversation. New messages arrive over Supabase Realtime; sending goes through a server action. */
export function LiveChat({ person, connectionId, messages }: { person: Musician; connectionId: number; messages: ChatMessage[] }) {
  const router = useRouter();
  const first = person.name.split(" ")[0];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [optimistic, setOptimistic] = useState<ChatMessage[]>([]);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  const shown = [...messages, ...optimistic];

  // A refresh brings the server's copy of anything we just sent, so drop the optimistic bubbles.
  useEffect(() => setOptimistic([]), [messages]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `connection_id=eq.${connectionId}` }, () =>
        router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, router]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || pending) return;
    setDraft("");
    setError(undefined);
    const temp: ChatMessage = { id: -Date.now(), mine: true, body, voiceUrl: null, createdAt: new Date(Date.now() - 1000).toISOString() };
    setOptimistic((o) => [...o, temp]);
    start(async () => {
      const res = await sendMessage(connectionId, body);
      if (res.error) {
        setError(res.error);
        setDraft(body);
        setOptimistic((o) => o.filter((m) => m.id !== temp.id));
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="relative h-dvh md:h-full flex flex-col">
      <ChatHeader person={person} />

      <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-[90px] flex flex-col gap-2">
        <div className="mt-auto" />
        {shown.length === 0 && (
          <p className="self-center max-w-[260px] text-center text-[14px] leading-[1.5] text-smoke py-6">
            You and {first} are connected.
            {person.shared[0] ? ` Ask what they love about ${person.shared[0].name}.` : " Say hi and share a clip."}
          </p>
        )}
        {shown.map((m, i) => {
          const prev = shown[i - 1];
          const gap = !prev || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 3_600_000;
          return (
            <div key={m.id} className="contents">
              {gap && <TimeAgo iso={m.createdAt} className="self-center text-[12px] text-smoke py-1" />}
              <div
                className={
                  m.mine
                    ? "self-end max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_6px_20px] bg-paper text-ink text-[15px] leading-[1.4] whitespace-pre-wrap break-words"
                    : "self-start max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_20px_6px] bg-stage text-[15px] leading-[1.4] whitespace-pre-wrap break-words"
                }
                style={m.id < 0 ? { opacity: 0.6 } : undefined}
              >
                {m.body ?? "Voice note"}
              </div>
            </div>
          );
        })}
        {error && <p role="alert" className="self-end text-[12px] text-[#FF453A]">{error}</p>}
        <div ref={end} />
      </div>

      <form
        onSubmit={submit}
        className="glass fixed md:absolute z-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4 md:right-4 w-[calc(min(100%,440px)-24px)] md:w-auto bottom-[max(env(safe-area-inset-bottom),16px)] md:bottom-4 h-[54px] rounded-[27px] flex items-center gap-2 pl-4 pr-[7px]"
      >
        <label htmlFor="msg" className="sr-only">Message</label>
        <input
          id="msg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${first}`}
          autoComplete="off"
          maxLength={4000}
          className="flex-1 h-10 bg-transparent text-[16px] outline-none placeholder:text-smoke"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim()}
          className="size-10 rounded-full bg-paper text-ink flex items-center justify-center disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>
    </main>
  );
}
