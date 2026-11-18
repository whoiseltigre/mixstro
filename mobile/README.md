# Mixstro for iPhone

A native iPhone app (Capacitor 8) that loads the live app at **app.mixstro.com** and adds the
parts a website can't do on its own:

| Native piece | Plugin | Where the site uses it |
| --- | --- | --- |
| Push notifications through Apple (APNs), no Home Screen step | `@capacitor/push-notifications` | `src/lib/push-client.ts`, sent by `src/lib/apns.ts` |
| Sign in with Apple (Face ID sheet) | `@capacitor-community/apple-sign-in` | `src/app/sign-in-buttons.tsx` |
| Google sign-in in a Safari sheet (Google blocks app web views) | `@capacitor/browser` + URL scheme `com.mixstro.app` | `src/app/sign-in-buttons.tsx`, `src/lib/verification.ts` |
| Links and notification taps open the right page | `@capacitor/app` | `src/components/native-shell.tsx` |
| Haptics, share sheet, splash, status bar | `@capacitor/haptics`, `share`, `splash-screen`, `status-bar` | `src/lib/native.ts` |

Sounds (picked 2026-11-18): notifications play `App/mixstro-notify.caf` ("Mallet call", named in
the APNs payload in `src/lib/apns.ts`). In-app, `src/lib/sounds.ts` plays `public/sounds/sent.m4a`
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
2. **APNs key**: Keys > + > Apple Push Notifications service. Download the .p8 once. In Amplify
   (app-level env vars): `APNS_KEY_ID`, `APNS_PRIVATE_KEY` (the .p8 contents), `APPLE_TEAM_ID`.
3. **Sign in with Apple for Supabase**: Supabase > Authentication > Providers > Apple: turn on,
   add `com.mixstro.app` to Client IDs (native sign-in needs no secret). For the website button
   too, also make a Services ID and secret. Then set `NEXT_PUBLIC_APPLE_SIGN_IN=on` in Amplify.
4. **Supabase redirect URL**: Authentication > URL Configuration > add
   `com.mixstro.app://auth/callback` (Google sign-in returns to the app through it).
5. **Database**: run `supabase/migrations/20261118000000_native_push.sql` in the SQL editor.
6. **App Review login**: make an account for review (e.g. appreview@mixstro.com), finish its
   profile, then set `REVIEW_LOGIN_EMAIL` and `REVIEW_LOGIN_CODE` (6 digits) in Amplify. The
   reviewer types that email and code on the normal email sign-in screen.

Until steps 2 to 6 are done, everything here is dormant: the website behaves exactly as before.
