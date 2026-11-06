"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyBoardReply } from "@/lib/notify";
import { redirect } from "next/navigation";
import { KINDS, type BoardKind } from "@/lib/board-kinds";
import { getViewer } from "@/lib/people";

/**
 * Posting, answering and closing. Row-level security is the real guard: you can only post
 * as yourself, answer open posts that aren't yours, and close your own.
 */

export type PostInput = {
  kind: BoardKind;
  title: string;
  role: string;
  details: string;
  neighborhood: string;
  paid: boolean;
  pay: string;
  closesOn: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max) || null;

export async function createPost(input: PostInput): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to post on the Board." };
  if (!KINDS.includes(input.kind)) return { error: "Pick what kind of post this is." };
  const title = clean(input.title, 80);
  if (!title || title.length < 3) return { error: "Give your post a short title." };
  const closesOn = /^\d{4}-\d{2}-\d{2}$/.test(input.closesOn) ? input.closesOn : null;

  const { data, error } = await viewer.supabase
    .from("board_posts")
    .insert({
      author_id: viewer.id,
      kind: input.kind,
      title,
      role: clean(input.role, 60),
      details: input.details.trim().slice(0, 1000) || null,
      neighborhood: clean(input.neighborhood, 80) ?? viewer.profile?.neighborhood ?? null,
      paid: Boolean(input.paid),
      pay: input.paid ? clean(input.pay, 40) : null,
      closes_on: closesOn,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "That didn't post. Try again." };
  revalidatePath("/board");
  redirect(`/board/${data.id}`);
}

/**
 * Answer with your profile. It also sends the author a Connect request (unless you're
 * already connected or one is pending), so you land at the top of their Today.
 */
export async function answerPost(postId: number, authorId: string, note: string): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to answer." };
  if (!UUID.test(authorId) || !Number.isInteger(postId)) return { error: "That post isn't on the Board anymore." };
  const { error } = await viewer.supabase.from("board_replies").insert({ post_id: postId, from_id: viewer.id, note: note.trim().slice(0, 280) || null });
  if (error) return { error: error.code === "23505" ? "You already answered this one." : "That didn't send. The post may have closed." };

  const { data: pair } = await viewer.supabase
    .from("connections")
    .select("id")
    .or(`and(from_id.eq.${viewer.id},to_id.eq.${authorId}),and(from_id.eq.${authorId},to_id.eq.${viewer.id})`);
  if (!pair?.length) await viewer.supabase.from("connections").insert({ from_id: viewer.id, to_id: authorId });
  const said = note.trim().slice(0, 280) || null;
  after(() => notifyBoardReply(postId, viewer.id, authorId, said));

  revalidatePath("/board", "layout");
  revalidatePath("/discover");
  return {};
}

export async function closePost(postId: number) {
  const viewer = await getViewer();
  if (!viewer) return;
  await viewer.supabase.from("board_posts").update({ closed_at: new Date().toISOString() }).eq("id", postId).eq("author_id", viewer.id);
  revalidatePath("/board", "layout");
  redirect("/board");
}
