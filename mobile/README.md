# Mixstro for iPhone and Android

A native iPhone app (Capacitor 8) that loads the live app at **app.mixstro.com** and adds the
parts a website can't do on its own:

| Native piece | Plugin | Where the site uses it |
| --- | --- | --- |
| Push notifications through Firebase (iPhone and Android), no Home Screen step | `@capacitor-firebase/messaging` | `src/lib/push-client.ts`, sent by `src/lib/fcm.ts` |
| Sign in with Apple (Face ID sheet) | `@capacitor-community/apple-sign-in` | `src/app/sign-in-buttons.tsx` |
| Google sign-in in a Safari sheet (Google blocks app web views) | `@capacitor/browser` + URL scheme `com.mixstro.app` | `src/app/sign-in-buttons.tsx`, `src/lib/verification.ts` |
| Links and notification taps open the right page | `@capacitor/app` | `src/components/native-shell.tsx` |
| Haptics, share sheet, splash, status bar | `@capacitor/haptics`, `share`, `splash-screen`, `status-bar` | `src/lib/native.ts` |

Sounds (picked 2026-11-18): notifications play `App/mixstro-notify.caf` ("Mallet call", named in
the APNs payload in `src/lib/fcm.ts`). In-app, `src/lib/sounds.ts` plays `public/sounds/sent.m4a`
("Rim click") when a chat message goes out and `connected.m4a` ("Mallet chord") when a Connect is
accepted. App only, muted by the silent switch.

Because the app loads the live site, every web release reaches the app at once. Only changes to
this folder (new plugins, icons, permissions) need a new App Store build.

## Build it (on a Mac with Xcode 16+)

```sh
cd mobile
npm install
npx cap sync ios
npx cap open ios        # opens Xcode
```

In Xcode: select the **App** target > Signing & Capabilities > pick the Mixstro team. The
entitlements file already asks for Push Notifications, Sign in with Apple and Associated Domains
(`applinks:app.mixstro.com`). Run on a phone, or Product > Archive to upload to TestFlight.

## One-time setup once the Apple Developer account is active

1. **Identifier**: developer.apple.com > Identifiers > App ID `com.mixstro.app` with Push
   Notifications, Sign in with Apple and Associated Domains turned on.
2. **Push (Firebase)**: Keys > + > Apple Push Notifications service; download the .p8 once and
   upload it in Firebase console > Project settings > Cloud Messaging > Apple app (with the key
   id and team id). Add the iOS app `com.mixstro.app` there and put `GoogleService-Info.plist`
   in `ios/App/App/` (add it to the App target in Xcode). On the website (Cloudflare worker
   secrets): `FIREBASE_SERVICE_ACCOUNT` = the service account JSON on one line.
3. **Sign in with Apple for Supabase**: Supabase > Authentication > Providers > Apple: turn on,
   add `com.mixstro.app` to Client IDs (native sign-in needs no secret). For the website button
   too, also make a Services ID and secret. Then set `NEXT_PUBLIC_APPLE_SIGN_IN=on` as a Cloudflare build variable.
4. **Supabase redirect URL**: Authentication > URL Configuration > add
   `com.mixstro.app://auth/callback` (Google sign-in returns to the app through it).
5. **Database**: run `supabase/migrations/20261118000000_native_push.sql` in the SQL editor.
6. **App Review login**: make an account for review (e.g. appreview@mixstro.com), finish its
   profile, then set `REVIEW_LOGIN_EMAIL` and `REVIEW_LOGIN_CODE` (6 digits) in Amplify. The
   reviewer types that email and code on the normal email sign-in screen.

Until steps 2 to 6 are done, everything here is dormant: the website behaves exactly as before.

## Android

The same shell runs on Android (`android/`, package `com.mixstro.app`). The web tab bar shows
on Android (the native tab bar is iPhone only); Google and Apple sign-in both open in a Chrome
Custom Tab and return through `com.mixstro.app://auth/callback`.

Build it (Android Studio, JDK 21):

```sh
cd mobile
npm ci
npx cap sync android   # without MIXSTRO_APP_URL for store builds
npx cap open android   # Build > Generate Signed App Bundle
```

One-time setup:

1. Upload key: Android Studio makes it while generating the first signed bundle. Keep the
   `.jks` file and its password out of git (ignored) and somewhere safe.
2. Play Console: create the app, turn on Play App Signing, upload the bundle to Internal testing.
3. App Links: copy the app signing key's SHA-256 (Test and release > App integrity) into the
   site's `ANDROID_CERT_SHA256` env var, so `/.well-known/assetlinks.json` verifies.
4. Push: add the Android app to the Firebase project and put `google-services.json` in
   `android/app/`.
5. Icons and splash come from `assets/` via `npx @capacitor/assets generate --android`; the
   adaptive icon foreground is the Stage Light icon at 88% on Ink.
