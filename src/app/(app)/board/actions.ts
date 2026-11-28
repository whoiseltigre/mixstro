"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyBoardReply } from "@/lib/notify";
import { redirect } from "next/navigation";
import { KINDS, type BoardKind } from "@/lib/board-kinds";
import { ROLE_IDS, expandRoles } from "@/lib/instruments";
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
  /** A structured opening: the role family you need ("Drums"). Empty for a plain post. */
  neededRole?: string;
  offeredRole?: string;
  days?: string[];
  radiusMi?: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max) || null;

export async function createPost(input: PostInput): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to post on the Board." };
  if (!KINDS.includes(input.kind)) return { error: "Pick what kind of post this is." };
  const title = clean(input.title, 80);
  if (!title || title.length < 3) return { error: "Give your post a short title." };
  const closesOn = /^\d{4}-\d{2}-\d{2}$/.test(input.closesOn) ? input.closesOn : null;
  const needed = input.neededRole && ROLE_IDS.includes(input.neededRole) ? input.neededRole : null;
  const opening = needed
    ? {
        needed_role: needed,
        needed_instruments: expandRoles([needed]),
        offered_role: input.offeredRole && ROLE_IDS.includes(input.offeredRole) ? input.offeredRole : null,
        rehearsal_days: (input.days ?? []).filter((d) => DAYS.includes(d)),
        radius_mi: Number.isInteger(input.radiusMi) && input.radiusMi! >= 1 && input.radiusMi! <= 100 ? input.radiusMi : null,
        // A session or dated sub request ends on its date; an ongoing search expires in 14 days.
        event_date: input.kind === "session" ? closesOn : null,
      }
    : {};

  const base = {
      author_id: viewer.id,
      kind: input.kind,
      title,
      role: clean(input.role, 60),
      details: input.details.trim().slice(0, 1000) || null,
      neighborhood: clean(input.neighborhood, 80) ?? viewer.profile?.neighborhood ?? null,
      paid: Boolean(input.paid),
      pay: input.paid ? clean(input.pay, 40) : null,
      closes_on: closesOn,
  };
  let { data, error } = await viewer.supabase.from("board_posts").insert({ ...base, ...opening }).select("id").single();
  // Before the openings migration: post it as a plain Board post.
  if (error && needed && (error.code === "PGRST204" || error.code === "42703")) ({ data, error } = await viewer.supabase.from("board_posts").insert(base).select("id").single());
  if (error || !data) return { error: "That didn't post. Try again." };
  revalidatePath("/board");
  // An opening lands on its share step: the musician you need is usually in a Facebook group or on Reddit, not here yet.
  redirect(needed ? `/board/${data.id}?posted=1` : `/board/${data.id}`);
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

  const said = note.trim().slice(0, 280) || null;
  // Your answer is the introduction, so no song is needed. Already connected or asked: nothing changes.
  // A failure here leaves the answer itself in place, which is what the author sees first.
  await viewer.supabase.rpc("request_connection", { p_to: authorId, p_note: said });
  after(() => notifyBoardReply(postId, viewer.id, authorId, said));

  revalidatePath("/board", "layout");
  revalidatePath("/discover");
  return {};
}

export async function closePost(postId: number) {
  const viewer = await getViewer();
  if (!viewer) return;
  await viewer.supabase.from("board_posts").update({ closed_at: new Date().toISOString() }).eq("id", postId); // RLS: your own post, or your band's open spot.
  revalidatePath("/board", "layout");
  redirect("/board");
}

/** Pause, mark filled, or reopen an opening (yours, or your band's). */
export async function setOpeningStatus(postId: number, status: "open" | "paused" | "filled"): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in again." };
  const { error } = await viewer.supabase.rpc("set_opening_status", { p_post: postId, p_status: status });
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/board", "layout");
  return {};
}

/** Keep an opening up for another two weeks. */
export async function renewOpening(postId: number): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in again." };
  const { error } = await viewer.supabase.rpc("renew_opening", { p_post: postId, p_days: 14 });
  if (error) return { error: error.message.includes("filled") ? "Filled openings stay filled. Post a new one." : "That didn't save. Try again." };
  revalidatePath("/board", "layout");
  return {};
}

/** Nobody nearby yet: get an alert when someone who plays this role joins. */
export async function alertMeFor(role: string): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer || !ROLE_IDS.includes(role)) return { error: "That didn't save." };
  const { data } = await viewer.supabase.from("profiles").select("alert_roles").eq("id", viewer.id).maybeSingle<{ alert_roles: string[] | null }>();
  const roles = [...new Set([...(data?.alert_roles ?? []), role])].slice(0, 10);
  const { error } = await viewer.supabase.from("profiles").update({ alert_roles: roles }).eq("id", viewer.id);
  return error ? { error: "That didn't save." } : {};
}

/**
 * Turn the public link on (with the one clip it may play) or off. Only the poster can, and
 * only with their own clip (the database checks both).
 */
export async function shareOpening(postId: number, on: boolean, clipId: number | null): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in again." };
  const { error } = await viewer.supabase
    .from("board_posts")
    .update({ shared_at: on ? new Date().toISOString() : null, share_clip_id: on && Number.isSafeInteger(clipId) ? clipId : null })
    .eq("id", postId)
    .eq("author_id", viewer.id);
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath(`/board/${postId}`);
  return {};
}
