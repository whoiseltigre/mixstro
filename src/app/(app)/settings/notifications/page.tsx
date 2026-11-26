"use client";

import { BackButton, Toggle } from "@/components/ui";
import { type Channel, NOTIFICATION_TYPES, useNotificationPrefs, wants } from "@/lib/notifications";
import { useState } from "react";
import { usePush } from "@/lib/push-client";
import { sendTestPush } from "./actions";
import { AlertRoles } from "./roles";

export default function NotificationSettings() {
  const { prefs, set, ready } = useNotificationPrefs();

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:max-w-[680px] md:mx-auto">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/settings" />
        <h1 className="headline text-title-lg">Notifications</h1>
      </header>
      <p className="text-callout text-smoke text-pretty -mt-2">Pick what reaches you and how. You can change this any time.</p>
      <ThisDevice />

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-caption font-semibold text-smoke px-1">
        <span />
        <span className="w-[51px] text-center">Push</span>
        <span className="w-[51px] text-center">Email</span>
      </div>
      <ul className="-mt-4 flex flex-col rounded-card bg-stage divide-y divide-paper/8">
        {NOTIFICATION_TYPES.map((t) => (
          <li key={t.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-3.5">
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-callout font-semibold">{t.title}</span>
              <span className="text-footnote text-smoke">{t.sub}</span>
            </span>
            {(["push", "email"] as Channel[]).map((c) => (
              <Toggle
                key={c}
                label={`${t.title} by ${c}`}
                on={wants(prefs, t.id, c)}
                disabled={!ready}
                onChange={(on) => set(t.id, c, on)}
              />
            ))}
          </li>
        ))}
      </ul>
      <AlertRoles />
    </main>
  );
}

/** Whether this phone or computer gets push, with the one fix that applies. */
function ThisDevice() {
  const { state, enable, disable } = usePush();
  if (state === "unavailable") return null;
  const copy: Record<string, { title: string; sub: string }> = {
    loading: { title: "Push on this device", sub: "Checking…" },
    on: { title: "Push is on for this device", sub: "Pick which ones below." },
    off: { title: "Push is off on this device", sub: "Turn it on to hear about Connects and messages right away." },
    blocked: { title: "Push is blocked on this device", sub: "Your browser is set to block Mixstro. Allow notifications for app.mixstro.com in its site settings." },
    install: { title: "Add Mixstro to your Home Screen", sub: "On iPhone and iPad, push works once Mixstro is on your Home Screen. Tap Share, then Add to Home Screen, and open it from there." },
  };
  const c = copy[state];
  return (
    <section className="flex flex-col gap-3 p-4 rounded-card bg-stage border border-paper/8">
      <div className="flex items-center gap-3">
      <span className={`size-2.5 rounded-full shrink-0 ${state === "on" ? "bg-success" : "bg-tungsten"}`} aria-hidden="true" />
      <span className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-callout font-semibold">{c.title}</span>
        <span className="text-footnote text-smoke text-pretty">{c.sub}</span>
      </span>
      {(state === "on" || state === "off") && <Toggle label="Push on this device" on={state === "on"} onChange={(on) => (on ? enable() : disable())} />}
      </div>
      {state === "on" && <TestPush />}
    </section>
  );
}

function TestPush() {
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3 pl-[22px]">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await sendTestPush().catch(() => ({ ok: false, error: "That didn't go through. Try again." }));
          setBusy(false);
          setNote(r.ok ? "Sent. It should pop up in a few seconds." : r.error);
        }}
        className="h-11 px-3.5 rounded-full border border-paper/20 text-subhead font-semibold disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send me a test"}
      </button>
      {note && <span className="text-footnote text-smoke">{note}</span>}
    </div>
  );
}

