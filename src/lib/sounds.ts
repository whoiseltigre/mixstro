"use client";

import { isNativeApp } from "@/lib/native";

/**
 * Mixstro's interface sounds, picked by Sundy on 2026-11-18 from the sound check:
 *   sent       "Rim click"    a light stick tap, when your chat message goes out
 *   connected  "Mallet chord" when you and another musician are now connected
 * (The notification sound, "Mallet call", ships inside the iPhone app as mixstro-notify.caf.)
 *
 * Only in the iPhone app, never on the website. They play through Web Audio with the
 * "ambient" audio session, so the phone's silent switch mutes them and music keeps playing.
 */
export type SoundName = "sent" | "connected";

const VOLUME: Record<SoundName, number> = { sent: 0.45, connected: 0.8 };

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

function context() {
  if (ctx) return ctx;
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) nav.audioSession.type = "ambient";
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  ctx = AC ? new AC() : null;
  return ctx;
}

function load(name: SoundName) {
  let p = buffers.get(name);
  if (!p) {
    const c = context();
    p = c
      ? fetch(`/sounds/${name}.m4a`)
          .then((r) => r.arrayBuffer())
          .then((b) => c.decodeAudioData(b))
          .catch(() => null)
      : Promise.resolve(null);
    buffers.set(name, p);
  }
  return p;
}

export async function playSound(name: SoundName) {
  if (typeof window === "undefined" || !isNativeApp()) return;
  try {
    const c = context();
    if (!c) return;
    if (c.state === "suspended") await c.resume();
    const buf = await load(name);
    if (!buf) return;
    const src = c.createBufferSource();
    const gain = c.createGain();
    gain.gain.value = VOLUME[name];
    src.buffer = buf;
    src.connect(gain).connect(c.destination);
    src.start();
  } catch {
    // A sound is never worth an error.
  }
}
