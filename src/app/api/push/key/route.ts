import { NextResponse } from "next/server";
import { adminClient } from "@/lib/notify";
import { vapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

/** GET /api/push/key → { key } the browser subscribes with. Public by design. */
export async function GET() {
  const db = adminClient();
  const k = db ? await vapidKeys(db) : null;
  if (!k) return NextResponse.json({ error: "Push isn't set up" }, { status: 503 });
  return NextResponse.json({ key: k.publicKey }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
