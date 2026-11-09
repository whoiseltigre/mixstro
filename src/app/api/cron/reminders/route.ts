import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/notify";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/cron/reminders, called every 15 minutes by Supabase pg_cron. The bearer token is
 * the secret Supabase generated (server_keys.cron_secret), or CRON_SECRET if that env var is set.
 */
export async function POST(req: Request) {
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!given || !(await allowed(given))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await runReminders());
}

async function allowed(token: string) {
  const env = process.env.CRON_SECRET;
  if (env) return token.length === env.length && timingSafeEqual(Buffer.from(token), Buffer.from(env));
  const db = adminClient();
  if (!db) return false;
  const { data } = await db.rpc("cron_secret_ok", { token });
  return data === true;
}
