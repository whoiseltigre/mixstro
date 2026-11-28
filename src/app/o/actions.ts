"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyBoardReply } from "@/lib/notify";
import { getViewer } from "@/lib/people";
import { getPublicOpening } from "@/lib/public-opening";

/**
 * Answer a shared opening. Every check runs again at the moment of sending: the opening must
 * still be open, you must be signed in, not the poster, not blocked, and not have answered
 * already. Answering twice (say, after coming back from sign-in) is refused by the database's
 * one-answer-per-person rule, so it can't land twice.
 */
export type ReplyOutcome = { outcome: "sent" | "already" | "closed" | "signed_out" | "own" | "unavailable" | "error"; status?: string };

export async function replyToOpening(id: number, note: string): Promise<ReplyOutcome> {
  if (!Number.isSafeInteger(id)) return { outcome: "unavailable" };
  const viewer = await getViewer();
  if (!viewer) return { outcome: "signed_out" };
  const opening = await getPublicOpening(String(id));
  if (!opening) return { outcome: "unavailable" };
  if (opening.status !== "open") return { outcome: "closed", status: opening.status };
  if (opening.author.id === viewer.id) return { outcome: "own" };
  const said = note.replace(/\s+/g, " ").trim().slice(0, 280) || null;
  let { error } = await viewer.supabase.from("board_replies").insert({ post_id: id, from_id: viewer.id, note: said, source: "link" });
  if (error && (error.code === "PGRST204" || error.code === "42703")) ({ error } = await viewer.supabase.from("board_replies").insert({ post_id: id, from_id: viewer.id, note: said }));
  if (error?.code === "23505") return { outcome: "already" };
  // RLS refuses answers to closed posts and across a block; both read as "not available".
  if (error) return { outcome: "unavailable" };
  await viewer.supabase.rpc("request_connection", { p_to: opening.author.id, p_note: said });
  after(() => notifyBoardReply(id, viewer.id, opening.author.id, said));
  revalidatePath("/board", "layout");
  return { outcome: "sent" };
}
