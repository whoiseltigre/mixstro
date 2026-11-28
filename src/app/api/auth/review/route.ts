import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * App Review sign-in. Apple's reviewers can't read a code from our inbox, so one fixed account
 * gets a fixed code instead. Off unless both env vars are set (Amplify, server-only):
 *   REVIEW_LOGIN_EMAIL  e.g. appreview@mixstro.com (an account made for review, nobody real)
 *   REVIEW_LOGIN_CODE   6 digits, given to Apple in the review notes
 * POST { email, code } -> { token_hash } that the browser trades for a session (verifyOtp).
 * Every other email or code gets the same 404, so this can't be used to probe accounts.
 */
export async function POST(request: Request) {
  const want = process.env.REVIEW_LOGIN_EMAIL?.trim().toLowerCase();
  const code = process.env.REVIEW_LOGIN_CODE?.trim();
  const nope = () => NextResponse.json({ error: "not found" }, { status: 404 });
  if (!want || !code || code.length < 6) return nope();

  const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const given = Buffer.from(String(body.code ?? "").trim());
  const expected = Buffer.from(code);
  if (email !== want || given.length !== expected.length || !timingSafeEqual(given, expected)) return nope();

  const db = adminClient();
  if (!db) return nope();
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email: want });
  if (error || !data.properties?.hashed_token) {
    console.error("review login:", error?.message);
    return nope();
  }
  return NextResponse.json({ token_hash: data.properties.hashed_token }, { headers: { "Cache-Control": "no-store" } });
}
