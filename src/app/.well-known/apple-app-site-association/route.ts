import { NextResponse } from "next/server";

/**
 * Universal links for the iPhone app: tapping an app.mixstro.com link (a profile, a band page,
 * a "Confirm your spot" invite) opens the app instead of Safari when it's installed.
 * Needs APPLE_TEAM_ID (already set for Apple Music) and the Associated Domains capability
 * (applinks:app.mixstro.com) in the Xcode project. Webcredentials lets iOS offer saved passwords.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  if (!team) return NextResponse.json({ error: "not set up" }, { status: 404 });
  const appID = `${team}.${process.env.APNS_BUNDLE_ID || "com.mixstro.app"}`;
  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: [appID],
            components: [
              { "/": "/@*" },
              { "/": "/p/*" },
              { "/": "/m/*" },
              { "/": "/b/*" },
              { "/": "/join/*" },
              { "/": "/messages*" },
              { "/": "/board*" },
            ],
          },
        ],
      },
      webcredentials: { apps: [appID] },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
