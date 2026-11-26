"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TimeAgo } from "@/components/time-ago";
import type { Musician } from "@/lib/mock";
import type { Jam } from "@/lib/jams";
import type { ChatMessage, ClipOption } from "@/lib/people";
import { createClient } from "@/lib/supabase/client";
import { useStickToBottom } from "@/lib/use-stick-to-bottom";
import { olderMessages, sendClipReply, sendMessage, sendVoice, type SendResult } from "../../actions";
import { mergeById, pendingNotIn, settle, type OutboxItem } from "@/lib/outbox";
import { ChatHeader } from "./chat-header";
import { AttachmentChip, ClipBubble, ClipPickerSheet, type Attachment } from "./clip-reply";
import { JamCard, PlanJamSheet } from "./jam";
import { VoiceBubble, clock, uploadVoice, useVoiceRecorder, type Recording } from "./voice";

/**
 * A real conversation. New messages arrive over Supabase Realtime. Each send gets its own id
 * (kept across retries) and shows straight away; the server answers with the stored message,
 * and the copy is swapped in by that id. A send that fails stays on screen with Retry, without
 * touching any other send in flight. Reconnecting or coming back to the app fetches anything
 * missed while away.
 */
export function LiveChat({
  person,
  connectionId,
  messages,
  jams,
  more,
  clips = [],
}: {
  person: Musician;
  connectionId: number;
  messages: ChatMessage[];
  jams: Jam[];
  more: boolean;
  /** Their clips and yours, to reply to. */
  clips?: ClipOption[];
}) {
  const router = useRouter();
  const first = person.name.split(" ")[0];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(more);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const voice = useVoiceRecorder(sendRecording);
  const [planning, setPlanning] = useState<{ replacing: Jam | null } | null>(null);
  const [picking, setPicking] = useState(false);
  const [attached, setAttached] = useState<Attachment | null>(null);
  const attachedOption = attached ? clips.find((c) => c.id === attached.id) : undefined;
  const canSend = Boolean(draft.trim() || attached);

  const stored = mergeById(older, messages);
  const pending = pendingNotIn(outbox, stored);
  const shown: (ChatMessage & { pending?: OutboxItem })[] = [
    ...stored,
    ...pending.map((o, i) => ({
      id: -(i + 1),
      mine: true,
      body: o.body,
      voiceUrl: o.voiceUrl ?? null,
      voiceSeconds: o.voiceSeconds,
      createdAt: o.createdAt,
      clientId: o.clientId,
      clip: o.clip ? pendingClip(o.clip, clips) : null,
      pending: o,
    })),
  ];
  // Messages and jam invites share one timeline, in the order they happened.
  type Item = { at: string; key: string; message?: (typeof shown)[number]; jam?: Jam };
  const timeline: Item[] = [
    ...shown.map((m) => ({ at: m.createdAt, key: m.pending ? `p${m.pending.clientId}` : `m${m.id}`, message: m })),
    ...jams.map((j) => ({ at: j.createdAt, key: `j${j.id}`, jam: j })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  // After a few messages back and forth with no plans yet, nudge toward actually playing.
  const suggestJam = jams.length === 0 && messages.length >= 6;

  // Confirmed sends whose stored copy has arrived drop out of the outbox.
  useEffect(() => setOutbox((o) => pendingNotIn(o, messages)), [messages]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let joined = false;
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `connection_id=eq.${connectionId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "jams", filter: `connection_id=eq.${connectionId}` }, () => router.refresh())
      .subscribe((status) => {
        // After a dropped connection, catch up on anything sent while we were away.
        if (status === "SUBSCRIBED" && joined) router.refresh();
        if (status === "SUBSCRIBED") joined = true;
      });
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [connectionId, router]);

  const scroller = useRef<HTMLDivElement>(null);
  useStickToBottom(scroller, messages.length + outbox.length);

  /** Sends one queued text or clip reply (first try or Retry) and settles just that send. */
  async function deliver(item: OutboxItem) {
    const res = await (item.clip ? sendClipReply(connectionId, item.clip.id, item.clip.at, item.body ?? "", item.clientId) : sendMessage(connectionId, item.body ?? "", item.clientId)).catch(
      () => ({ error: "That didn't send. Check your connection and try again." }) as SendResult,
    );
    setOutbox((o) => settle(o, item.clientId, res.error ? { error: res.error } : { storedId: res.message!.id }));
    if (!res.error) router.refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body && !attached) return;
    setDraft("");
    setAttached(null);
    setError(undefined);
    const item: OutboxItem = { clientId: newClientId(), body: body || null, clip: attached, createdAt: new Date().toISOString(), status: "sending" };
    setOutbox((o) => [...o, item]);
    void deliver(item);
  }

  function retry(item: OutboxItem) {
    // A voice note that failed is dismissed and recorded again rather than re-uploaded from memory.
    if (item.voiceUrl) return setOutbox((o) => o.filter((x) => x.clientId !== item.clientId));
    setOutbox((o) => o.map((x) => (x.clientId === item.clientId ? { ...x, status: "sending", error: undefined } : x)));
    void deliver(item);
  }

  /** Shows the note straight away from the local recording, then uploads and posts it. */
  function sendRecording({ blob, seconds }: Recording) {
    setError(undefined);
    const item: OutboxItem = { clientId: newClientId(), body: null, voiceUrl: URL.createObjectURL(blob), voiceSeconds: seconds, createdAt: new Date().toISOString(), status: "sending" };
    setOutbox((o) => [...o, item]);
    void (async () => {
      const up = await uploadVoice(connectionId, blob);
      const res: SendResult = up.path
        ? await sendVoice(connectionId, up.path, seconds, item.clientId).catch(() => ({ error: "That didn't send. Try again." }) as SendResult)
        : { error: up.error ?? "That didn't send. Try again." };
      setOutbox((o) => settle(o, item.clientId, res.error ? { error: res.error } : { storedId: res.message!.id }));
      if (!res.error) router.refresh();
    })();
  }

  async function loadOlder() {
    const oldest = stored[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const page = await olderMessages(person.username, { id: oldest.id, createdAt: oldest.createdAt }).catch(() => null);
    setLoadingOlder(false);
    if (!page) return setError("Couldn't load earlier messages. Try again.");
    setOlder((o) => mergeById(page.messages, o));
    setHasOlder(page.more);
  }

  return (
    <main className="relative h-dvh md:h-full flex flex-col">
      <ChatHeader person={person} onPlanJam={() => setPlanning({ replacing: null })} />

      <div ref={scroller} className={`flex-1 overflow-y-auto px-3.5 pt-4 flex flex-col gap-2 ${attached ? "pb-[136px]" : "pb-[90px]"}`}>
        <div className="mt-auto" />
        {hasOlder && (
          <button
            type="button"
            onClick={loadOlder}
            disabled={loadingOlder}
            className="hit-slop relative self-center h-8 px-3.5 rounded-full border border-paper/20 text-footnote text-smoke hover:bg-paper/10 transition disabled:opacity-50"
          >
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {timeline.length === 0 && (
          <p className="self-center max-w-[260px] text-center text-subhead leading-[1.5] text-smoke py-6">
            You and {first} are connected.
            {person.shared[0] ? ` Ask what they love about ${person.shared[0].name}.` : " Say hi and share a clip."}
          </p>
        )}
        {timeline.length === 0 && (
          <div className="self-center flex flex-wrap justify-center gap-2 max-w-[340px]" role="group" aria-label="Conversation starters">
            {starters(person).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDraft(t)}
                className="h-11 px-3.5 rounded-full border border-paper/20 text-footnote hover:bg-paper/10 transition"
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {timeline.map((item, i) => {
          const prev = timeline[i - 1];
          const gap = !prev || new Date(item.at).getTime() - new Date(prev.at).getTime() > 3_600_000;
          const m = item.message;
          return (
            <div key={item.key} className="contents">
              {gap && <TimeAgo iso={item.at} className="self-center text-caption text-smoke py-1" />}
              {item.jam ? (
                <JamCard jam={item.jam} first={first} onAnotherTime={(jam) => setPlanning({ replacing: jam })} />
              ) : !m ? null : m.clip ? (
                <ClipBubble clip={m.clip} body={m.body} mine={m.mine} first={first} faded={m.pending ? (m.pending.status === "failed" ? 0.45 : 0.6) : undefined} />
              ) : m.voiceUrl !== null || m.voiceSeconds ? (
                <VoiceBubble url={m.voiceUrl} seconds={m.voiceSeconds} mine={m.mine} sending={m.pending?.status === "sending"} />
              ) : (
                <div
                  className={
                    m.mine
                      ? "self-end max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_6px_20px] bubble-own text-callout leading-[1.4] whitespace-pre-wrap break-words"
                      : "self-start max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_20px_6px] bg-stage text-callout leading-[1.4] whitespace-pre-wrap break-words"
                  }
                  style={m.pending ? { opacity: m.pending.status === "failed" ? 0.45 : 0.6 } : undefined}
                >
                  {m.body ?? "Voice note"}
                </div>
              )}
              {m?.pending?.status === "failed" && (
                <p role="alert" className="self-end -mt-1 flex items-center gap-2 text-caption text-danger">
                  {m.pending.error ?? "Not sent."}
                  <button type="button" onClick={() => retry(m.pending!)} className="font-semibold underline underline-offset-2">
                    {m.pending.voiceUrl ? "Dismiss" : "Retry"}
                  </button>
                </p>
              )}
            </div>
          );
        })}
        {suggestJam && (
          <button
            type="button"
            onClick={() => setPlanning({ replacing: null })}
            className="self-center mt-2 h-11 px-4 rounded-full border border-paper/30 text-footnote font-semibold text-paper hover:bg-paper/10 transition"
          >
            Sounds like a fit. Plan a jam with {first}?
          </button>
        )}
        {(error || voice.error) && (
          <p role="alert" className="self-end text-caption text-danger">
            {error ?? voice.error}
          </p>
        )}
      </div>

      <form
        onSubmit={submit}
        className="glass fixed md:absolute z-20 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4 md:right-4 w-[calc(min(100%,440px)-24px)] md:w-auto bottom-[max(env(safe-area-inset-bottom),16px)] md:bottom-4 h-[54px] rounded-sheet flex items-center gap-2 pl-4 pr-[7px]"
      >
        {voice.recording ? (
          <>
            <button
              type="button"
              onClick={voice.cancel}
              aria-label="Cancel voice note"
              className="size-11 -ml-[9px] rounded-full bg-riser flex items-center justify-center shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <span className="flex-1 flex items-center gap-2.5" aria-live="polite">
              <span className="size-2.5 rounded-full bg-danger animate-pulse" aria-hidden="true" />
              <span className="text-body tabular-nums">{clock(voice.seconds)}</span>
              <span className="text-footnote text-smoke truncate">Recording for {first}</span>
            </span>
            <button
              type="button"
              onClick={voice.stop}
              aria-label="Send voice note"
              className="hit-slop relative size-10 rounded-full bg-tungsten text-ink flex items-center justify-center shrink-0"
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
              placeholder={attached ? "Add a note (optional)" : `Message ${first}`}
              autoComplete="off"
              maxLength={4000}
              className="flex-1 h-10 bg-transparent text-body outline-none placeholder:text-smoke"
            />
            {clips.length > 0 && (
              <button
                type="button"
                onClick={() => setPicking(true)}
                aria-label="Reply to a clip"
                className={`hit-slop relative size-9 rounded-full flex items-center justify-center shrink-0 ${attached ? "bg-tungsten text-ink" : "bg-paper/12 text-paper"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18V5l11-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="17" cy="16" r="3" />
                </svg>
              </button>
            )}
            {canSend ? (
              <button type="submit" aria-label="Send" className="hit-slop relative size-10 rounded-full bg-paper text-ink flex items-center justify-center">
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
                className="hit-slop relative size-10 rounded-full bg-paper text-ink flex items-center justify-center"
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
      {attached && attachedOption && <AttachmentChip option={attachedOption} at={attached.at} first={first} onRemove={() => setAttached(null)} />}
      {picking && <ClipPickerSheet options={clips} first={first} onPick={setAttached} onClose={() => setPicking(false)} />}
      {planning && (
        <PlanJamSheet
          connectionId={connectionId}
          first={first}
          replacing={planning.replacing}
          onClose={() => setPlanning(null)}
          onSent={() => {
            router.refresh();
          }}
        />
      )}
    </main>
  );
}

/** #3 Openers for an empty chat, built from what you both listen to. Tapping one fills the box to edit or send. */
function starters(person: Musician) {
  const [a, b] = person.shared;
  return [
    a ? `What do you love most about ${a.name}?` : `What are you listening to lately?`,
    b ? `${a!.name} and ${b.name}! Ever play any of their stuff?` : null,
    "Down to jam this week?",
    "Send me a clip of what you've been playing?",
  ].filter((x): x is string => Boolean(x));
}

/** The clip on a send still in flight, from the clips this chat already knows. */
function pendingClip(clip: { id: number; at: number | null }, options: ClipOption[]): ChatMessage["clip"] {
  const o = options.find((c) => c.id === clip.id);
  return o ? { id: clip.id, at: clip.at, available: true, url: o.url, provider: o.provider, mine: o.mine, duration: o.duration } : { id: clip.id, at: clip.at, available: false };
}

/** A fresh id for one send, kept across its retries. */
function newClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}
