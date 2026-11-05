"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { TimeAgo } from "@/components/time-ago";
import type { Musician } from "@/lib/mock";
import type { ChatMessage } from "@/lib/people";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, sendVoice } from "../../actions";
import { ChatHeader } from "./chat-header";
import { VoiceBubble, clock, uploadVoice, useVoiceRecorder, type Recording } from "./voice";

/** A real conversation. New messages arrive over Supabase Realtime; sending goes through a server action. */
export function LiveChat({ person, connectionId, messages }: { person: Musician; connectionId: number; messages: ChatMessage[] }) {
  const router = useRouter();
  const first = person.name.split(" ")[0];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [optimistic, setOptimistic] = useState<ChatMessage[]>([]);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const voice = useVoiceRecorder(sendRecording);

  const shown = [...messages, ...optimistic];

  // A refresh brings the server's copy of anything we just sent, so drop the optimistic bubbles.
  useEffect(() => setOptimistic([]), [messages]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `connection_id=eq.${connectionId}`,
        },
        () => router.refresh(),
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
    const temp: ChatMessage = {
      id: -Date.now(),
      mine: true,
      body,
      voiceUrl: null,
      createdAt: new Date(Date.now() - 1000).toISOString(),
    };
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

  /** Shows the note straight away from the local recording, then uploads and posts it. */
  function sendRecording({ blob, seconds }: Recording) {
    setError(undefined);
    const local = URL.createObjectURL(blob);
    const temp: ChatMessage = {
      id: -Date.now(),
      mine: true,
      body: null,
      voiceUrl: local,
      voiceSeconds: seconds,
      createdAt: new Date().toISOString(),
    };
    setOptimistic((o) => [...o, temp]);
    start(async () => {
      const up = await uploadVoice(connectionId, blob);
      const res = up.path ? await sendVoice(connectionId, up.path, seconds) : { error: up.error };
      if (res.error) {
        setError(res.error);
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
              {m.voiceUrl !== null || m.voiceSeconds ? (
                <VoiceBubble url={m.voiceUrl} seconds={m.voiceSeconds} mine={m.mine} sending={m.id < 0} />
              ) : (
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
              )}
            </div>
          );
        })}
        {(error || voice.error) && (
          <p role="alert" className="self-end text-[12px] text-[#FF453A]">
            {error ?? voice.error}
          </p>
        )}
        <div ref={end} />
      </div>

      <form
        onSubmit={submit}
        className="glass fixed md:absolute z-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4 md:right-4 w-[calc(min(100%,440px)-24px)] md:w-auto bottom-[max(env(safe-area-inset-bottom),16px)] md:bottom-4 h-[54px] rounded-[27px] flex items-center gap-2 pl-4 pr-[7px]"
      >
        {voice.recording ? (
          <>
            <button
              type="button"
              onClick={voice.cancel}
              aria-label="Cancel voice note"
              className="size-10 -ml-[9px] rounded-full bg-riser flex items-center justify-center shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <span className="flex-1 flex items-center gap-2.5" aria-live="polite">
              <span className="size-2.5 rounded-full bg-[#FF453A] animate-pulse" aria-hidden="true" />
              <span className="text-[16px] tabular-nums">{clock(voice.seconds)}</span>
              <span className="text-[13px] text-smoke truncate">Recording for {first}</span>
            </span>
            <button
              type="button"
              onClick={voice.stop}
              aria-label="Send voice note"
              className="size-10 rounded-full bg-tungsten text-ink flex items-center justify-center shrink-0"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <label htmlFor="msg" className="sr-only">
              Message
            </label>
            <input
              id="msg"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${first}`}
              autoComplete="off"
              maxLength={4000}
              className="flex-1 h-10 bg-transparent text-[16px] outline-none placeholder:text-smoke"
            />
            {draft.trim() ? (
              <button type="submit" aria-label="Send" className="size-10 rounded-full bg-paper text-ink flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  voice.clearError();
                  voice.start();
                }}
                aria-label="Record a voice note"
                className="size-10 rounded-full bg-paper text-ink flex items-center justify-center"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0014 0M12 18v3" />
                </svg>
              </button>
            )}
          </>
        )}
      </form>
    </main>
  );
}
