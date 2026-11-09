import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/cron/reminders, called every 15 minutes by Supabase pg_cron with the CRON_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const result = await runReminders();
  return NextResponse.json(result);
}
