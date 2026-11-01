"use client";

import { BackButton } from "@/components/ui";
import { type Channel, NOTIFICATION_TYPES, useNotificationPrefs, wants } from "@/lib/notifications";

export default function NotificationSettings() {
  const { prefs, set, ready } = useNotificationPrefs();

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:max-w-[680px] md:mx-auto">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/settings" />
        <h1 className="headline text-[28px]">Notifications</h1>
      </header>
      <p className="text-[15px] text-smoke text-pretty -mt-2">Pick what reaches you and how. You can change this any time.</p>

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[12px] font-semibold text-smoke px-1">
        <span />
        <span className="w-[51px] text-center">Push</span>
        <span className="w-[51px] text-center">Email</span>
      </div>
      <ul className="-mt-4 flex flex-col rounded-[20px] bg-stage divide-y divide-paper/8">
        {NOTIFICATION_TYPES.map((t) => (
          <li key={t.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-3.5">
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[15px] font-semibold">{t.title}</span>
              <span className="text-[13px] text-smoke">{t.sub}</span>
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
    </main>
  );
}

function Toggle({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors disabled:opacity-40 ${on ? "bg-[#30D158]" : "bg-paper/16"}`}
    >
      <span className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-paper shadow transition-transform ${on ? "translate-x-[20px]" : ""}`} />
    </button>
  );
}
