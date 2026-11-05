"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const MAX_VOICE_SECONDS = 60;

/** Safari records AAC in MP4; Chrome and Firefox record Opus in WebM. */
function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export type Recording = { blob: Blob; seconds: number };

/**
 * Hold-free voice notes: tap the mic to start, tap send to finish (or cancel).
 * Stops by itself at a minute, which is plenty to play someone a riff.
 */
export function useVoiceRecorder(onDone: (r: Recording) => void) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);
  const keep = useRef(true);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(
    () => () => {
      keep.current = false;
      if (timer.current) clearInterval(timer.current);
      rec.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    setError(undefined);
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) return setError("This browser can't record audio.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      return setError("Mixstro needs microphone access for voice notes. You can allow it in your browser settings.");
    }
    const r = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 64000 });
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      setSeconds(null);
      const secs = Math.max(1, Math.round((Date.now() - started.current) / 1000));
      if (keep.current && chunks.length) done.current({ blob: new Blob(chunks, { type: r.mimeType || "audio/webm" }), seconds: Math.min(secs, MAX_VOICE_SECONDS) });
    };
    rec.current = r;
    keep.current = true;
    started.current = Date.now();
    r.start(250);
    setSeconds(0);
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - started.current) / 1000);
      if (s >= MAX_VOICE_SECONDS) r.stop();
      else setSeconds(s);
    }, 250);
  }

  /** Finish and hand the recording to onDone. */
  function stop() {
    keep.current = true;
    if (rec.current?.state === "recording") rec.current.stop();
  }

  /** Throw the recording away. */
  function cancel() {
    keep.current = false;
    if (rec.current?.state === "recording") rec.current.stop();
    else setSeconds(null);
  }

  return { recording: seconds !== null, seconds: seconds ?? 0, error, clearError: () => setError(undefined), start, stop, cancel };
}

/** Uploads to voice/<connection>/<you>/<time>.<ext>; storage rules only let the two of you in. */
export async function uploadVoice(connectionId: number, blob: Blob): Promise<{ path?: string; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { error: "Voice notes need an account." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to send voice notes." };
  const type = blob.type.split(";")[0];
  const ext = type === "audio/mp4" ? "m4a" : type === "audio/webm" ? "webm" : type === "audio/ogg" ? "ogg" : "audio";
  const path = `${connectionId}/${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("voice").upload(path, blob, { contentType: type || "audio/webm", upsert: false });
  if (error) return { error: "That voice note didn't upload. Try again." };
  return { path };
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// A fixed, friendly waveform. Real peaks would need decoding every file; this reads as "voice note" at a glance.
const BARS = [6, 12, 18, 10, 20, 16, 8, 14, 20, 12, 8, 17, 19, 11, 7, 15, 18, 10, 13, 20, 11, 16, 9, 14];

/** A voice note bubble: play/pause, a waveform that fills as it plays, and the time left. */
export function VoiceBubble({ url, seconds, mine, sending }: { url: string | null; seconds?: number | null; mine: boolean; sending?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [length, setLength] = useState(seconds ?? 0);
  const progress = length ? Math.min(1, at / length) : 0;

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      // Pause any other voice note that's playing.
      document.querySelectorAll<HTMLAudioElement>("audio[data-voice]").forEach((o) => o !== a && o.pause());
      a.play().catch(() => setPlaying(false));
    } else a.pause();
  }

  const fg = mine ? "bg-ink" : "bg-paper";
  return (
    <div style={sending ? { opacity: 0.6 } : undefined} className={`w-[236px] flex items-center gap-2.5 px-3 py-2.5 ${mine ? "self-end rounded-[20px_20px_6px_20px] bg-paper text-ink" : "self-start rounded-[20px_20px_20px_6px] bg-stage"}`}>
      {url && (
        <audio
          ref={audio}
          data-voice
          src={url}
          preload="metadata"
          onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLength(e.currentTarget.duration)}
          onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setAt(0);
          }}
        />
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`size-8 shrink-0 rounded-full flex items-center justify-center disabled:opacity-40 ${mine ? "bg-ink text-paper" : "bg-paper text-ink"}`}
      >
        {playing ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
        )}
      </button>
      <div aria-hidden="true" className="flex-1 flex items-center gap-0.5 h-[22px]">
        {BARS.map((h, i) => (
          <span key={i} className={`w-[3px] rounded-sm ${fg} transition-opacity`} style={{ height: h, opacity: i / BARS.length < progress ? 1 : 0.35 }} />
        ))}
      </div>
      <span className="text-[12px] font-medium tabular-nums">{url ? clock(playing || at ? Math.max(0, length - at) : length) : "Unavailable"}</span>
    </div>
  );
}
