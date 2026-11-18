import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The iPhone app loads the live site (app.mixstro.com) inside a native shell, so every web
 * release reaches the app at once with no App Store update. Native parts (push through APNs,
 * Sign in with Apple, haptics, share sheet, Safari sheet for Google sign-in, splash and status
 * bar) come from the plugins in package.json; the site reaches them through src/lib/native.ts.
 *
 * www/ only holds the screen shown when the phone is offline on first launch.
 */
const config: CapacitorConfig = {
  appId: "com.mixstro.app",
  appName: "Mixstro",
  webDir: "www",
  server: {
    url: "https://app.mixstro.com/discover",
    // Only Mixstro pages load inside the app; anything else opens in Safari.
    allowNavigation: ["app.mixstro.com", "mixstro.com", "pcnyiyendctvbjcdgrpn.supabase.co"],
    errorPath: "offline.html",
  },
  // Lets the server tell the app apart from mobile Safari in logs and analytics.
  appendUserAgent: "MixstroApp/1.0",
  backgroundColor: "#0F0D0B",
  ios: {
    contentInset: "never",
    scheme: "Mixstro",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 1500, launchAutoHide: false, backgroundColor: "#0F0D0B", showSpinner: false },
    StatusBar: { style: "DARK", overlaysWebView: true },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
