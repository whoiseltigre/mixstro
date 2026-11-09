"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Turning on push for this device: register the service worker, ask permission, subscribe,
 * and save the subscription so the server can reach it (src/lib/push.ts).
 *
 * iPhone and iPad only allow web push once Mixstro is added to the Home Screen (iOS 16.4+),
 * so there the state is "install" until it's opened from the Home Screen.
 */

/** The server's public push key (env at build time, else /api/push/key). */
let vapid: Promise<string> | null = null;
function publicKey() {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return Promise.resolve(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  vapid ??= fetch("/api/push/key")
    .then((r) => (r.ok ? r.json() : {}))
    .then((j: { key?: string }) => j.key ?? "")
    .catch(() => "");
  return vapid.then((k) => {
    if (!k) vapid = null;
    return k;
  });
}

export type PushState =
  | "loading"
  /** Push isn't set up on the server yet, or the browser has no push at all. */
  | "unavailable"
  /** iPhone/iPad in Safari: add to Home Screen first. */
  | "install"
  | "off"
  | "on"
  /** They said no in the browser's prompt; only browser settings can undo it. */
  | "blocked";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "loading";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIOS() && !standalone() ? "install" : "unavailable";
  if (!(await publicKey())) return "unavailable";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Asks permission (must run from a tap) and saves this device. */
export async function enablePush(): Promise<PushState> {
  const state = await currentPushState();
  if (state === "unavailable" || state === "install" || state === "blocked") return state;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(await publicKey()) }));
  const json = sub.toJSON();
  const supabase = createClient();
  if (supabase && json.endpoint && json.keys?.p256dh && json.keys?.auth) {
    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent,
    });
    if (error) {
      console.error("push: save", error.message);
      return "off";
    }
  }
  return "on";
}

/** Turns push off for this device only. */
export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const supabase = createClient();
    await supabase?.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
  return "off";
}

export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  useEffect(() => {
    currentPushState().then(setState).catch(() => setState("unavailable"));
  }, []);
  const enable = useCallback(async () => {
    setState("loading");
    setState(await enablePush().catch(() => "off" as const));
  }, []);
  const disable = useCallback(async () => {
    setState("loading");
    setState(await disablePush().catch(() => "off" as const));
  }, []);
  return { state, enable, disable };
}
