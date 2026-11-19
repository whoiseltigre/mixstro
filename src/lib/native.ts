"use client";

/**
 * The iPhone app (mobile/) is a Capacitor shell that loads app.mixstro.com. Inside it, the
 * native bridge is injected as window.Capacitor, and every plugin the shell ships is reachable
 * at window.Capacitor.Plugins.<Name>, so the website needs no extra npm packages. In a normal
 * browser none of this exists and every helper here quietly does nothing.
 */

type Listener = { remove: () => Promise<void> };
type Plugin = Record<string, (...args: never[]) => Promise<unknown>> & {
  addListener?: (event: string, cb: (data: never) => void) => Promise<Listener>;
};
type Bridge = { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: Record<string, Plugin | undefined> };

function bridge(): Bridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: Bridge }).Capacitor ?? null;
}

/** True only inside the Mixstro iPhone/Android app. */
export function isNativeApp() {
  return bridge()?.isNativePlatform?.() === true;
}

export function nativePlatform(): "ios" | "android" | "web" {
  const p = bridge()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}

/** A plugin the shell ships, or null in the browser (or an older app build without it). */
export function plugin<T>(name: string): T | null {
  if (!isNativeApp()) return null;
  return (bridge()?.Plugins?.[name] as T | undefined) ?? null;
}

// ---- Haptics -----------------------------------------------------------------------------

type HapticsPlugin = {
  impact: (o: { style: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void>;
  notification: (o: { type: "SUCCESS" | "WARNING" | "ERROR" }) => Promise<void>;
};

/** A light tap on iPhone (sends, likes, saves). Does nothing on the web. */
export function tapHaptic(style: "LIGHT" | "MEDIUM" | "HEAVY" = "LIGHT") {
  plugin<HapticsPlugin>("Haptics")?.impact({ style }).catch(() => {});
}

export function successHaptic() {
  plugin<HapticsPlugin>("Haptics")?.notification({ type: "SUCCESS" }).catch(() => {});
}

// ---- Share sheet -------------------------------------------------------------------------

type SharePlugin = { share: (o: { title?: string; text?: string; url?: string; files?: string[] }) => Promise<unknown> };

/**
 * The native share sheet in the app, navigator.share in browsers that have it.
 * Returns false when neither exists, so the caller can fall back to copying the link.
 */
export async function shareLink(data: { title?: string; text?: string; url: string }): Promise<boolean> {
  const native = plugin<SharePlugin>("Share");
  try {
    if (native) {
      await native.share(data);
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(data);
      return true;
    }
  } catch {
    // They closed the sheet: still handled.
    return true;
  }
  return false;
}

// ---- Opening links outside the app -------------------------------------------------------

type BrowserPlugin = { open: (o: { url: string; presentationStyle?: "popover" | "fullscreen" }) => Promise<void>; close: () => Promise<void> };

/**
 * Opens a page in an in-app Safari sheet (SFSafariViewController). Used for Google sign-in,
 * which Google refuses inside app web views, and for links that leave Mixstro.
 */
export async function openInSafari(url: string) {
  const b = plugin<BrowserPlugin>("Browser");
  if (b) return b.open({ url, presentationStyle: "popover" });
  window.location.href = url;
}

export async function closeSafari() {
  try {
    // Throws "No active window to close" when no Safari sheet is open; that's fine.
    await plugin<BrowserPlugin>("Browser")?.close();
  } catch {
    // Nothing to close.
  }
}

/** The app's own URL scheme. Sign-in in Safari returns here (add it to Supabase's redirect list). */
export const APP_SCHEME = "com.mixstro.app";
export const NATIVE_AUTH_CALLBACK = `${APP_SCHEME}://auth/callback`;

// ---- Sign in with Apple ------------------------------------------------------------------

type AppleSignInPlugin = {
  authorize: (o: {
    clientId: string;
    redirectURI: string;
    scopes?: string;
    state?: string;
    nonce?: string;
  }) => Promise<{ response: { identityToken: string; givenName?: string | null; familyName?: string | null; email?: string | null } }>;
};

function randomString(bytes = 16) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Native Sign in with Apple (the Face ID sheet). Apple gets the hashed nonce, Supabase gets the
 * raw one, so a stolen token can't be replayed. Returns null if the app has no Apple plugin.
 */
export async function nativeAppleSignIn(): Promise<{ token: string; nonce: string; name?: string } | null> {
  const apple = plugin<AppleSignInPlugin>("SignInWithApple");
  if (!apple) return null;
  const nonce = randomString();
  const { response } = await apple.authorize({
    clientId: "com.mixstro.app",
    redirectURI: "https://app.mixstro.com/auth/callback",
    scopes: "email name",
    nonce: await sha256Hex(nonce),
  });
  // Apple sends the name only the very first time someone signs in, so keep it for onboarding.
  const name = [response.givenName, response.familyName].filter(Boolean).join(" ") || undefined;
  return { token: response.identityToken, nonce, name };
}

// ---- Push notifications (APNs) -----------------------------------------------------------

type PermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";
type PushPlugin = {
  checkPermissions: () => Promise<{ receive: PermissionState }>;
  requestPermissions: () => Promise<{ receive: PermissionState }>;
  register: () => Promise<void>;
  unregister?: () => Promise<void>;
  addListener: (event: string, cb: (data: never) => void) => Promise<Listener>;
};

export function nativePush() {
  return plugin<PushPlugin>("PushNotifications");
}

/**
 * Asks iOS for permission and returns this device's push token (APNs), or the permission
 * state if there is no token. Must run from a tap.
 */
export async function registerNativePush(): Promise<{ token?: string; state: "granted" | "denied" | "prompt" }> {
  const push = nativePush();
  if (!push) return { state: "denied" };
  let { receive } = await push.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") receive = (await push.requestPermissions()).receive;
  if (receive !== "granted") return { state: receive === "denied" ? "denied" : "prompt" };
  const token = await new Promise<string | undefined>((resolve) => {
    const subs: Promise<Listener>[] = [];
    const done = (t?: string) => {
      subs.forEach((s) => s.then((l) => l.remove()).catch(() => {}));
      resolve(t);
    };
    subs.push(push.addListener("registration", ((t: { value: string }) => done(t.value)) as (d: never) => void));
    subs.push(push.addListener("registrationError", (() => done(undefined)) as (d: never) => void));
    setTimeout(() => done(undefined), 15000);
    push.register().catch(() => done(undefined));
  });
  return { token, state: "granted" };
}
