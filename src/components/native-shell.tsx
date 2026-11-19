"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_SCHEME, closeSafari, isNativeApp, mixstroNative, nativeMenu, nativePush, plugin, shareLink } from "@/lib/native";

type Listener = { remove: () => Promise<void> };
type AppPlugin = { addListener: (e: "appUrlOpen", cb: (d: { url: string }) => void) => Promise<Listener> };
type StatusBarPlugin = { setStyle: (o: { style: "DARK" | "LIGHT" | "DEFAULT" }) => Promise<void> };
type SplashPlugin = { hide: () => Promise<void> };
type KeyboardPlugin = { setAccessoryBarVisible: (o: { isVisible: boolean }) => Promise<void> };

/** Links whose long press opens a native menu: musician pages, band pages, public pages. */
const MENU_LINK = /^\/(m|b|p)\/[^/]+\/?$|^\/@[^/]+\/?$/;

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
    // No "< > Done" bar above the keyboard; iPhone apps don't have one.
    plugin<KeyboardPlugin>("Keyboard")?.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
    // Tapping a text field never zooms the page in (pinch zoom isn't an app gesture either).
    const vp = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (vp && !/maximum-scale/.test(vp.content)) vp.content += ", maximum-scale=1, user-scalable=no";
    // The service worker caches screens and assets so the app opens fast, and offline (public/sw.js).
    navigator.serviceWorker?.register("/sw.js?app=1", { scope: "/" }).catch(() => {});

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

    // Pull to refresh: fetch the page's data again, then let the spinner go.
    const native = mixstroNative();
    if (native) {
      subs.push(
        native.addListener("refresh", () => {
          router.refresh();
          setTimeout(() => native.endRefresh().catch(() => {}), 900);
        }),
      );
    }

    const stopMenus = longPressMenus((href) => router.push(href));
    return () => {
      stopMenus();
      subs.forEach((s) => s.then((l) => l.remove()).catch(() => {}));
    };
  }, [router]);

  return null;
}

/**
 * Press and hold a musician or band link for a native menu (Open, Share, Copy link), the way
 * iPhone apps answer a long press. A tap still just opens the link.
 */
function longPressMenus(open: (href: string) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let start: { x: number; y: number } | null = null;
  let swallowClick = false;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const onStart = (e: TouchEvent) => {
    cancel();
    const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    const href = link?.getAttribute("href") ?? "";
    if (!link || !MENU_LINK.test(href) || e.touches.length !== 1) return;
    start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    timer = setTimeout(async () => {
      timer = null;
      swallowClick = true;
      const name = (link.getAttribute("aria-label") || link.innerText || "").split("\n").map((t) => t.trim()).find(Boolean)?.slice(0, 40);
      const url = new URL(href, location.origin).href;
      const picked = await nativeMenu(name, [{ title: "Open" }, { title: "Share" }, { title: "Copy link" }]);
      if (picked === 0) open(href);
      if (picked === 1) shareLink({ title: name, url });
      if (picked === 2) navigator.clipboard?.writeText(url).catch(() => {});
      setTimeout(() => (swallowClick = false), 400);
    }, 450);
  };

  const onMove = (e: TouchEvent) => {
    if (!start || !timer) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10) cancel();
  };

  const onClick = (e: MouseEvent) => {
    if (!swallowClick) return;
    e.preventDefault();
    e.stopPropagation();
  };

  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", cancel, { passive: true });
  document.addEventListener("touchcancel", cancel, { passive: true });
  document.addEventListener("click", onClick, true);
  return () => {
    cancel();
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", cancel);
    document.removeEventListener("touchcancel", cancel);
    document.removeEventListener("click", onClick, true);
  };
}
