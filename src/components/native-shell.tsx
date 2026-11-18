"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_SCHEME, closeSafari, isNativeApp, nativePush, plugin } from "@/lib/native";

type Listener = { remove: () => Promise<void> };
type AppPlugin = { addListener: (e: "appUrlOpen", cb: (d: { url: string }) => void) => Promise<Listener> };
type StatusBarPlugin = { setStyle: (o: { style: "DARK" | "LIGHT" | "DEFAULT" }) => Promise<void> };
type SplashPlugin = { hide: () => Promise<void> };

/** Only paths inside Mixstro, never another site. */
function safePath(u: string | undefined) {
  return u && u.startsWith("/") && !u.startsWith("//") ? u : null;
}

/**
 * Glue for the iPhone app, mounted once in the root layout. Does nothing in a browser.
 * - Marks <html data-native="ios"> so CSS and components can hide web-only bits
 *   (Add to Home Screen guides, install prompts).
 * - Links back into the app (sign-in returning from Safari, universal links) open the right page.
 * - Tapping a notification opens the page it is about.
 */
export function NativeShell() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.dataset.native = "ios";
    plugin<StatusBarPlugin>("StatusBar")?.setStyle({ style: "DARK" }).catch(() => {});
    plugin<SplashPlugin>("SplashScreen")?.hide().catch(() => {});

    const subs: Promise<Listener>[] = [];

    const app = plugin<AppPlugin>("App");
    if (app) {
      subs.push(
        app.addListener("appUrlOpen", ({ url }) => {
          let parsed: URL;
          try {
            parsed = new URL(url);
          } catch {
            return;
          }
          // com.mixstro.app://auth/callback?code=… : finish sign-in on our own callback page,
          // which reads the sign-in cookie this web view saved before Safari opened.
          if (parsed.protocol === `${APP_SCHEME}:`) {
            closeSafari();
            const path = `/${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
            if (path === "/auth/callback") window.location.href = `/auth/callback${parsed.search}`;
            return;
          }
          // https://app.mixstro.com/p/maya (universal link) -> same page in the app.
          if (/(^|\.)mixstro\.com$/.test(parsed.hostname)) router.push(`${parsed.pathname}${parsed.search}`);
        }),
      );
    }

    const push = nativePush();
    if (push) {
      subs.push(
        push.addListener("pushNotificationActionPerformed", ((e: { notification?: { data?: { url?: string } } }) => {
          const path = safePath(e.notification?.data?.url);
          if (path) router.push(path);
        }) as (d: never) => void),
      );
    }

    return () => subs.forEach((s) => s.then((l) => l.remove()).catch(() => {}));
  }, [router]);

  return null;
}
