"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Small confirmations at the bottom of the screen, with an optional action.
 * `undoable()` is for removals: the thing disappears straight away, an Undo shows for
 * a few seconds, and only then is the change saved (or right away if the page closes).
 */

type Toast = { id: number; message: string; action?: { label: string; run: () => void }; leaving?: boolean };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
const snapshot = () => toasts;
const empty: Toast[] = [];

function dismiss(id: number) {
  if (!toasts.some((t) => t.id === id && !t.leaving)) return;
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 220);
}

export function toast(message: string, opts: { action?: Toast["action"]; duration?: number } = {}) {
  const id = nextId++;
  // One at a time, like iOS: a new one replaces what's showing.
  toasts.filter((t) => !t.leaving).forEach((t) => dismiss(t.id));
  toasts = [...toasts, { id, message, action: opts.action }];
  emit();
  setTimeout(() => dismiss(id), opts.duration ?? 3200);
  return id;
}

const pending = new Map<number, () => void>();

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    pending.forEach((commit) => commit());
    pending.clear();
  });
}

/** Hide something now (you already did), save the change after the Undo window closes. */
export function undoable({ message, commit, undo, duration = 5000 }: { message: string; commit: () => void | Promise<unknown>; undo: () => void; duration?: number }) {
  // Another removal while one is waiting: save the earlier one now.
  pending.forEach((c) => c());
  pending.clear();
  let settled = false;
  const doCommit = () => {
    if (settled) return;
    settled = true;
    pending.delete(id);
    void commit();
  };
  const id = toast(message, {
    duration,
    action: {
      label: "Undo",
      run: () => {
        if (settled) return;
        settled = true;
        pending.delete(id);
        undo();
      },
    },
  });
  pending.set(id, doCommit);
  setTimeout(doCommit, duration);
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, snapshot, () => empty);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 bottom-[calc(max(env(safe-area-inset-bottom),16px)+84px)] md:bottom-8"
    >
      {list.map((t) => (
        <ToastRow key={t.id} t={t} />
      ))}
    </div>
  );
}

function ToastRow({ t }: { t: Toast }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const visible = shown && !t.leaving;
  return (
    <div
      role="status"
      className={`pointer-events-auto glass !bg-[rgb(41_38_36/0.88)] rounded-full pl-5 ${t.action ? "pr-1.5" : "pr-5"} h-12 max-w-[440px] flex items-center gap-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)] transition duration-200 ease-out ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.97]"
      }`}
    >
      <span className="text-[15px] truncate">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.run();
            dismiss(t.id);
          }}
          className="h-9 px-4 rounded-full bg-paper/12 hover:bg-paper/20 text-[15px] font-semibold text-tungsten shrink-0"
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}
