"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FadeImg } from "@/components/fade-image";
import { TimeAgo } from "@/components/time-ago";
import { BackButton } from "@/components/ui";
import { artistTint } from "@/lib/artists";
import type { BandChat, BandChatMessage } from "@/lib/band-hub";
import { showDate } from "@/lib/band-shared";
import { nameWash } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import { sendBandMessage, sendBandVoice } from "../../../bands/actions";
import { VoiceBubble, clock, uploadVoice, useVoiceRecorder, type Recording } from "../../[id]/voice";

/** The band chat: members talk, and the band's updates (new show, someone asked about the open spot) land here too. */
export function BandChatView({ chat }: { chat: BandChat }) {
  const router = useRouter();
  const { band } = chat;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [optimistic, setOptimistic] = useState<BandChatMessage[]>([]);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const voice = useVoiceRecorder(sendRecording);
  const shown = [...chat.messages, ...optimistic];
  const names = chat.members.map((m) => m.name);
  const who = names.length ? `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` and ${names.length - 3} more` : ""} and you` : "Just you so far";

  useEffect(() => setOptimistic([]), [chat.messages]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || chat.demo) return;
    const channel = supabase
      .channel(`band:${band.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "band_messages", filter: `band_id=eq.${band.id}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [band.id, chat.demo, router]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || pending) return;
    setDraft("");
    setError(undefined);
    const temp: BandChatMessage = { id: -Date.now(), kind: "text", mine: true, body, voiceUrl: null, createdAt: new Date().toISOString() };
    setOptimistic((o) => [...o, temp]);
    start(async () => {
      const res = await sendBandMessage(band.id, body).catch(() => ({ error: "That didn't send. Check your connection and try again." }));
      if (res.error) {
        setError(res.error);
        setDraft(body);
        setOptimistic((o) => o.filter((m) => m.id !== temp.id));
        return;
      }
      router.refresh();
    });
  }

  function sendRecording({ blob, seconds }: Recording) {
    setError(undefined);
    const temp: BandChatMessage = { id: -Date.now(), kind: "voice", mine: true, body: null, voiceUrl: URL.createObjectURL(blob), voiceSeconds: seconds, createdAt: new Date().toISOString() };
    setOptimistic((o) => [...o, temp]);
    start(async () => {
      const up = await uploadVoice(`band-${band.id}`, blob);
      const res = up.path ? await sendBandVoice(band.id, up.path, seconds).catch(() => ({ error: "That didn't send. Try again." })) : { error: up.error };
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
      <header className="glass rounded-b-[26px] md:rounded-none md:bg-transparent md:backdrop-blur-none md:border-x-0 md:border-b md:border-paper/8 border-t-0 pt-safe md:pt-3 px-3.5 md:px-5 pb-3 flex items-center gap-2.5 z-10">
        <span className="md:hidden">
          <BackButton href="/messages" />
        </span>
        <span className="relative size-10 rounded-[12px] overflow-hidden shrink-0" style={{ background: nameWash(band.name) }}>
          {band.photo && <FadeImg src={band.photo} alt="" className="absolute inset-0 size-full object-cover" />}
        </span>
        <Link href={`/bands/${band.id}`} className="flex-1 min-w-0 flex flex-col">
          <span className="text-[16px] font-semibold truncate">{band.name}</span>
          <span className="text-[12px] text-smoke truncate">{who}</span>
        </Link>
        <Link href={`/b/${band.id}`} className="glass h-[34px] px-3 rounded-full text-[13px] font-semibold flex items-center shrink-0">
          Band page
        </Link>
      </header>

      {chat.nextShow && <PinnedShow show={chat.nextShow} />}

      <div className="flex-1 overflow-y-auto px-3.5 pt-4 pb-[90px] flex flex-col gap-2">
        <div className="mt-auto" />
        {shown.length === 0 && (
          <p className="self-center max-w-[280px] text-center text-[14px] leading-[1.5] text-smoke py-6">
            This is {band.name}&apos;s chat. Everyone who plays in it now is here, and new shows and answers to your open spots show up too.
          </p>
        )}
        {shown.map((m, i) => {
          const prev = shown[i - 1];
          const gap = !prev || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 3_600_000;
          const sameSender = prev && !gap && prev.sender?.username === m.sender?.username && prev.mine === m.mine && (prev.kind === "text" || prev.kind === "voice");
          return (
            <div key={m.id} className="contents">
              {gap && <TimeAgo iso={m.createdAt} className="self-center text-[12px] text-smoke py-1" />}
              <Item m={m} bandId={band.id} showName={!m.mine && !sameSender} demo={chat.demo} />
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
            <button type="button" onClick={voice.cancel} aria-label="Cancel voice note" className="size-10 -ml-[9px] rounded-full bg-riser flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <span className="flex-1 flex items-center gap-2.5" aria-live="polite">
              <span className="size-2.5 rounded-full bg-[#FF453A] animate-pulse" aria-hidden="true" />
              <span className="text-[16px] tabular-nums">{clock(voice.seconds)}</span>
              <span className="text-[13px] text-smoke truncate">Recording for {band.name}</span>
            </span>
            <button type="button" onClick={voice.stop} aria-label="Send voice note" className="hit-slop relative size-10 rounded-full bg-tungsten text-ink flex items-center justify-center shrink-0">
              <Arrow />
            </button>
          </>
        ) : (
          <>
            <label htmlFor="band-msg" className="sr-only">
              Message the band
            </label>
            <input
              id="band-msg"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message the band"
              autoComplete="off"
              maxLength={4000}
              className="flex-1 h-10 bg-transparent text-[16px] outline-none placeholder:text-smoke"
            />
            {draft.trim() ? (
              <button type="submit" aria-label="Send" className="hit-slop relative size-10 rounded-full bg-paper text-ink flex items-center justify-center">
                <Arrow />
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
    </main>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function PinnedShow({ show }: { show: NonNullable<BandChat["nextShow"]> }) {
  const d = showDate(show.date);
  return (
    <div className="mx-3.5 mt-3 rounded-[18px] border border-tungsten/30 bg-stage/80 px-3.5 py-2.5 flex items-center gap-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-smoke">Next show</span>
      <span className="text-[14px] font-semibold truncate">
        {show.venue} · {d.weekday} {d.month} {d.day}
        {show.time ? ` · ${show.time}` : ""}
      </span>
    </div>
  );
}

function Avatar({ s }: { s: NonNullable<BandChatMessage["sender"]> }) {
  return (
    <span className="relative size-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: artistTint(s.username) }}>
      {s.photo ? <FadeImg src={s.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" /> : s.name.slice(0, 1)}
    </span>
  );
}

/** One line in the chat: a message, a voice note, or one of the band's updates as a card. */
function Item({ m, bandId, showName, demo }: { m: BandChatMessage; bandId: string; showName: boolean; demo: boolean }) {
  const s = m.sender;
  if (m.kind === "joined") {
    return <p className="self-center text-[13px] text-smoke py-1">{m.mine ? "You confirmed your spot" : `${s?.name ?? "Someone"} confirmed their spot`} 🎉</p>;
  }
  if (m.kind === "show") {
    return (
      <Link href={`/b/${bandId}`} className="self-center max-w-[300px] w-full rounded-[18px] bg-stage px-4 py-3 flex flex-col gap-0.5 my-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-tungsten">New show</span>
        <span className="text-[15px] font-semibold">{m.body}</span>
        <span className="text-[12px] text-smoke">It&apos;s on the band page now</span>
      </Link>
    );
  }
  if (m.kind === "spot_reply" || m.kind === "note") {
    const href = demo ? "/board" : m.kind === "spot_reply" && m.refId ? `/board/${m.refId}` : s ? `/m/${s.username}` : "#";
    return (
      <div className="self-center max-w-[320px] w-full rounded-[20px] bg-stage border border-paper/8 p-3.5 flex flex-col gap-2.5 my-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-tungsten">{m.kind === "spot_reply" ? "Open spot" : "Note for the band"}</span>
        <span className="flex items-center gap-3">
          {s && (
            <span className="relative size-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold" style={{ background: artistTint(s.username) }}>
              {s.photo ? <FadeImg src={s.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" /> : s.name.slice(0, 1)}
            </span>
          )}
          <span className="flex flex-col min-w-0">
            <span className="text-[15px] font-semibold">{m.kind === "spot_reply" ? `${s?.name ?? "A musician"} asked about ${m.body}` : `${s?.name ?? "A musician"} wrote to the band`}</span>
            {s && s.instrument !== m.body && <span className="text-[13px] text-smoke">{s.instrument}</span>}
          </span>
        </span>
        {m.kind === "note" && m.body && <p className="text-[15px] leading-[1.45] bg-riser rounded-[14px] px-3 py-2">{m.body}</p>}
        <Link href={href} className="self-start h-9 px-4 rounded-full bg-paper text-ink text-[14px] font-semibold flex items-center">
          {m.kind === "spot_reply" ? "See everyone who asked" : `See ${s?.name ?? "their"} profile`}
        </Link>
      </div>
    );
  }
  const bubble = m.kind === "voice" || m.voiceUrl !== null ? (
    <VoiceBubble url={m.voiceUrl} seconds={m.voiceSeconds} mine={m.mine} sending={m.id < 0} />
  ) : (
    <div
      className={
        m.mine
          ? "max-w-[78%] px-3.5 py-2.5 rounded-[20px_20px_6px_20px] bg-paper text-ink text-[15px] leading-[1.4] whitespace-pre-wrap break-words"
          : "max-w-[100%] px-3.5 py-2.5 rounded-[20px_20px_20px_6px] bg-stage text-[15px] leading-[1.4] whitespace-pre-wrap break-words"
      }
      style={m.id < 0 ? { opacity: 0.6 } : undefined}
    >
      {m.body}
    </div>
  );
  if (m.mine) return <div className="self-end flex flex-col items-end max-w-[78%]">{bubble}</div>;
  return (
    <div className="self-start flex items-end gap-2 max-w-[82%]">
      {s && showName ? <Avatar s={s} /> : <span className="w-7 shrink-0" />}
      <div className="flex flex-col gap-1 min-w-0">
        {s && showName && <span className="text-[12px] text-smoke pl-1.5">{s.name}</span>}
        {bubble}
      </div>
    </div>
  );
}
