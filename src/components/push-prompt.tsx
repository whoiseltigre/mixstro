"use client";

import { useEffect, useState } from "react";
import { type PushState, currentPushState, enablePush } from "@/lib/push-client";
import { Sheet, SheetCloser } from "./sheet";
import { Button } from "./ui";

const ASKED = "mixstro:push-asked";
const SYNCED = "mixstro:push-synced";
export const CONNECTED_EVENT = "mixstro:connected";

/** Call after a Connect is sent, so the push ask shows up at the moment it makes sense. */
export function announceConnect(firstName?: string) {
  window.dispatchEvent(new CustomEvent(CONNECTED_EVENT, { detail: { firstName } }));
}

/**
 * Lives in the app layout. After your first Connect it offers notifications once
 * ("Know when Maya answers"), or on iPhone explains Add to Home Screen. It also re-saves
 * this device's subscription once a day, so it follows whoever is signed in.
 */
export function PushPrompt() {
  const [ask, setAsk] = useState<{ state: PushState; name?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Keep an existing subscription attached to the person signed in now.
    try {
      const last = Number(localStorage.getItem(SYNCED) ?? 0);
      if (Date.now() - last > 24 * 3600_000) {
        currentPushState().then(async (s) => {
          if (s !== "on") return;
          await enablePush().catch(() => {});
          localStorage.setItem(SYNCED, String(Date.now()));
        });
      }
    } catch {
      // Private mode: fine.
    }

    const onConnect = async (e: Event) => {
      try {
        if (localStorage.getItem(ASKED)) return;
      } catch {
        return;
      }
      const state = await currentPushState();
      if (state !== "off" && state !== "install") return;
      try {
        localStorage.setItem(ASKED, String(Date.now()));
      } catch {
        // Private mode: may ask again next time.
      }
      setAsk({ state, name: (e as CustomEvent<{ firstName?: string }>).detail?.firstName });
    };
    window.addEventListener(CONNECTED_EVENT, onConnect);
    return () => window.removeEventListener(CONNECTED_EVENT, onConnect);
  }, []);

  if (!ask) return null;
  const who = ask.name ?? "they";
  return (
    <Sheet onClose={() => setAsk(null)} labelledBy="push-title" scrimClassName="bg-ink/60 backdrop-blur-sm" className="glass md:max-w-[420px] rounded-t-[28px] md:rounded-[28px] p-6 pb-safe md:pb-6 flex flex-col gap-4">
      <SheetCloser>{(close) => (<>
        <span className="size-12 rounded-2xl bg-tungsten/20 text-tungsten flex items-center justify-center" aria-hidden="true">
          <BellIcon />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id="push-title" className="headline text-[24px]">
            {ask.name ? `Know when ${ask.name} answers` : "Know when musicians answer"}
          </h2>
          {ask.state === "install" ? (
            <p className="text-[15px] leading-[1.45] text-smoke text-pretty">
              On iPhone, notifications work once Mixstro is on your Home Screen. Tap <ShareIcon /> Share below, then <b className="text-paper font-semibold">Add to Home Screen</b>, and open Mixstro from there.
            </p>
          ) : (
            <p className="text-[15px] leading-[1.45] text-smoke text-pretty">
              We&apos;ll only tell you about Connects, messages, jams and Board answers. Change it any time in Settings.
            </p>
          )}
        </div>
        {ask.state === "install" ? (
          <Button onClick={close}>Got it</Button>
        ) : (
          <>
            <Button
              variant="gel"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await enablePush().catch(() => {});
                setBusy(false);
                close();
              }}
            >
              {busy ? "Turning on…" : "Turn on notifications"}
            </Button>
            <button type="button" onClick={close} className="h-11 text-[15px] font-semibold text-smoke">
              {who === "they" ? "Not now" : "Not now, I'll check back"}
            </button>
          </>
        )}
      </>)}</SheetCloser>
    </Sheet>
  );
}

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-1 text-paper" aria-label="Share icon">
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 12v8h14v-8" />
    </svg>
  );
}
