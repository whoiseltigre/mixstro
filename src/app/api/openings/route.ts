import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { callerIp, readJson, withinBudget } from "@/lib/request-guard";

/** POST { id, kind: "open" | "listen" } from a shared opening page. Low-trust counts, budgeted per address. */
export async function POST(req: Request) {
  const body = (await readJson(req, 256)) as { id?: unknown; kind?: unknown } | null | undefined;
  const id = Number(body?.id);
  const kind = body?.kind;
  if (!Number.isSafeInteger(id) || (kind !== "open" && kind !== "listen")) return NextResponse.json({ ok: false }, { status: 400 });
  const db = adminClient();
  const ip = await callerIp();
  if (db && (await withinBudget([{ key: `opening:${kind}:ip:${ip}`, limit: 120, windowSeconds: 3600 }, { key: `opening:${kind}:all`, limit: 20000, windowSeconds: 3600 }]))) {
    await db.rpc("opening_link_count", { p_post: id, p_kind: kind }).then(() => {}, () => {});
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
