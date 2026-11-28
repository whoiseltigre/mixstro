import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The iPhone and Android apps load the live site (app.mixstro.com) inside a native shell, so every web
 * release reaches the app at once with no App Store update. Native parts (push through APNs,
 * Sign in with Apple, haptics, share sheet, Safari sheet for Google sign-in, splash and status
 * bar) come from the plugins in package.json; the site reaches them through src/lib/native.ts.
 *
 * www/ only holds the screen shown when the phone is offline on first launch.
 */
// For testing a branch before it's live: MIXSTRO_APP_URL=http://localhost:3000 npx cap sync ios
const APP_URL = (process.env.MIXSTRO_APP_URL || "https://app.mixstro.com").replace(/\/$/, "");
const local = APP_URL.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.mixstro.app",
  appName: "Mixstro",
  webDir: "www",
  server: {
    url: `${APP_URL}/discover`,
    cleartext: local,
    // Only Mixstro pages load inside the app; anything else opens in Safari.
    allowNavigation: ["app.mixstro.com", "mixstro.com", "pcnyiyendctvbjcdgrpn.supabase.co", ...(local ? ["localhost"] : [])],
    errorPath: "offline.html",
  },
  // Lets the server tell the app apart from mobile Safari in logs and analytics.
  appendUserAgent: "MixstroApp/1.0",
  backgroundColor: "#0F0D0B",
  ios: {
    contentInset: "never",
    scheme: "Mixstro",
    // App-bound domains (WKAppBoundDomains in Info.plist) let the site's service worker run in
    // the app, which keeps screens and assets cached for fast and offline launches.
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    // Chrome's own debugging only in local test builds.
    webContentsDebuggingEnabled: local,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 1500, launchAutoHide: false, backgroundColor: "#0F0D0B", showSpinner: false },
    StatusBar: { style: "DARK", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    // The web view shrinks above the keyboard, so chat's message box rides up with it.
    Keyboard: { resize: "native", resizeOnFullScreen: true },
  },
};

export default config;
