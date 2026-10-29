"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui";

const MAX_SECONDS = 60;
const MIN_SECONDS = 5;

type State = { kind: "idle" } | { kind: "recording"; seconds: number } | { kind: "preview"; blob: Blob; url: string; seconds: number };

/** Safari records AAC in MP4; Chrome and Firefox record Opus in WebM. */
function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/**
 * Record a clip straight from the phone (#6). Saves to the "clips" Storage bucket when signed in,
 * or as a data URL in demo mode, then hands the playable URL to `onSaved`.
 */
export function ClipRecorder({ onSaved, disabled }: { onSaved: (url: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    setError(undefined);
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) {
      return setError("This browser can't record audio. Paste a link instead.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      return setError("Mixstro needs microphone access to record. You can allow it in your browser settings.");
    }
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 96000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      const seconds = Math.round((Date.now() - started.current) / 1000);
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      setState({ kind: "preview", blob, url: URL.createObjectURL(blob), seconds });
    };
    recorder.current = rec;
    started.current = Date.now();
    rec.start(250);
    setState({ kind: "recording", seconds: 0 });
    timer.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - started.current) / 1000);
      if (seconds >= MAX_SECONDS) rec.stop();
      else setState({ kind: "recording", seconds });
    }, 250);
  }

  function reset() {
    if (state.kind === "preview") URL.revokeObjectURL(state.url);
    setState({ kind: "idle" });
  }

  async function save() {
    if (state.kind !== "preview") return;
    setSaving(true);
    const { url, error } = await uploadRecording(state.blob);
    setSaving(false);
    if (error || !url) return setError(error ?? "Couldn't save the clip. Try again.");
    reset();
    onSaved(url);
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-[20px] bg-stage border border-paper/10">
      <div className="flex items-center gap-3">
        <span className="flex-1 flex flex-col gap-0.5">
          <span className="text-[16px] font-semibold">Record a clip</span>
          <span className="text-[13px] text-smoke">Up to {MAX_SECONDS} seconds. A phone recording is perfect.</span>
        </span>
        {state.kind === "idle" && (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            aria-label="Start recording"
            className="size-14 rounded-full bg-paper text-ink flex items-center justify-center shrink-0 active:scale-95 transition disabled:opacity-40"
          >
            <span className="size-5 rounded-full bg-[#FF453A]" />
          </button>
        )}
        {state.kind === "recording" && (
          <button
            type="button"
            onClick={() => (state.seconds >= MIN_SECONDS ? recorder.current?.stop() : undefined)}
            aria-label="Stop recording"
            className="size-14 rounded-full glass flex items-center justify-center shrink-0 active:scale-95 transition"
          >
            <span className="size-4 rounded-[3px] bg-[#FF453A]" />
          </button>
        )}
      </div>

      {state.kind === "recording" && (
        <div className="flex items-center gap-3" aria-live="polite">
          <span className="size-2 rounded-full bg-[#FF453A] animate-pulse" aria-hidden="true" />
          <div className="flex-1 h-1 rounded-full bg-paper/15 overflow-hidden">
            <div className="h-full bg-paper transition-[width] duration-200" style={{ width: `${(state.seconds / MAX_SECONDS) * 100}%` }} />
          </div>
          <span className="text-[13px] tabular-nums text-smoke">
            0:{String(state.seconds).padStart(2, "0")}
          </span>
        </div>
      )}
      {state.kind === "recording" && state.seconds < MIN_SECONDS && (
        <p className="text-[12px] text-smoke">Keep going, at least {MIN_SECONDS} seconds.</p>
      )}

      {state.kind === "preview" && (
        <div className="flex flex-col gap-3">
          <audio src={state.url} controls className="w-full h-10" />
          <div className="flex gap-2">
            <Button variant="glass" onClick={reset} className="h-11 text-[15px]">
              Re-record
            </Button>
            <Button onClick={save} disabled={saving} className="h-11 text-[15px]">
              {saving ? "Saving…" : "Use this clip"}
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-[#FF453A]">{error}</p>}
    </div>
  );
}

async function uploadRecording(blob: Blob): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();
  if (!supabase) {
    // Demo mode: keep the recording in the local draft.
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: String(reader.result) });
      reader.onerror = () => resolve({ error: "Couldn't read the recording." });
      reader.readAsDataURL(blob);
    });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save your clip." };
  const type = blob.type.split(";")[0];
  const ext = type === "audio/mp4" ? "m4a" : type === "audio/webm" ? "webm" : "audio";
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("clips").upload(path, blob, { contentType: type, upsert: false });
  if (error) return { error: error.message };
  return { url: supabase.storage.from("clips").getPublicUrl(path).data.publicUrl };
}
