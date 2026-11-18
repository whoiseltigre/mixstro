"use client";

import { useCallback, useEffect, useState } from "react";
import { isNativeApp, nativePlatform, nativePush, registerNativePush } from "@/lib/native";
import { createClient } from "@/lib/supabase/client";

/**
 * Turning on push for this device: register the service worker, ask permission, subscribe,
 * and save the subscription so the server can reach it (src/lib/push.ts).
 *
 * iPhone and iPad only allow web push once Mixstro is added to the Home Screen (iOS 16.4+),
 * so there the state is "install" until it's opened from the Home Screen.
 *
 * Inside the Mixstro iPhone app, push goes through Apple's own service (APNs) instead: the
 * device token is saved to native_push_tokens and src/lib/apns.ts sends to it.
 */

const NATIVE_TOKEN_KEY = "mixstro:native-push-token";

function storedNativeToken() {
  try {
    return localStorage.getItem(NATIVE_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function nativeState(): Promise<PushState> {
  const push = nativePush();
  if (!push) return "unavailable";
  const { receive } = await push.checkPermissions();
  if (receive === "denied") return "blocked";
  if (receive !== "granted") return "off";
  return storedNativeToken() ? "on" : "off";
}

async function enableNative(): Promise<PushState> {
  const { token, state } = await registerNativePush();
  if (!token) return state === "denied" ? "blocked" : "off";
  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.rpc("save_native_push_token", { p_token: token, p_platform: nativePlatform() === "android" ? "android" : "ios" });
    if (error) {
      console.error("push: save token", error.message);
      return "off";
    }
  }
  try {
    localStorage.setItem(NATIVE_TOKEN_KEY, token);
  } catch {
    // Private storage: still on for this session.
  }
  return "on";
}

async function disableNative(): Promise<PushState> {
  const token = storedNativeToken();
  if (token) await createClient()?.from("native_push_tokens").delete().eq("token", token);
  try {
    localStorage.removeItem(NATIVE_TOKEN_KEY);
  } catch {
    // Nothing stored.
  }
  return "off";
}

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
  if (isNativeApp()) return nativeState();
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
  if (isNativeApp()) return enableNative();
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
  if (isNativeApp()) return disableNative();
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
