import { getViewer } from "./people";

/**
 * The first-two-weeks checklist on Today: a photo, one song or project, and one real
 * reach-out (a Connect, a Board post or a Board answer). It goes away once all three
 * are done, or 14 days after signup.
 */

export type StartStep = { id: "photo" | "music" | "reach"; title: string; sub: string; href: string; done: boolean };
export type GetStarted = { steps: StartStep[]; done: number };

const DAY = 24 * 60 * 60 * 1000;
export const GET_STARTED_DAYS = 14;

export async function getGetStarted(): Promise<GetStarted | null> {
  const viewer = await getViewer();
  if (!viewer?.profile?.onboarded_at) return null;
  const db = viewer.supabase;
  const me = viewer.id;

  const [{ data: profile }, projects, connects, posts, answers] = await Promise.all([
    db.from("profiles").select("created_at, avatar_url").eq("id", me).maybeSingle<{ created_at: string; avatar_url: string | null }>(),
    db.from("projects").select("id", { count: "exact", head: true }).eq("profile_id", me),
    db.from("connections").select("id", { count: "exact", head: true }).eq("from_id", me).neq("status", "passed"),
    db.from("board_posts").select("id", { count: "exact", head: true }).eq("author_id", me),
    db.from("board_replies").select("id", { count: "exact", head: true }).eq("from_id", me),
  ]);
  if (!profile || Date.now() - new Date(profile.created_at).getTime() > GET_STARTED_DAYS * DAY) return null;

  const reached = (connects.count ?? 0) + (posts.count ?? 0) + (answers.count ?? 0) > 0;
  const steps: StartStep[] = [
    { id: "photo", title: "Add a photo", sub: "People reply to a face, not a blank circle.", href: "/me", done: Boolean(profile.avatar_url) },
    { id: "music", title: "Add a song or a project", sub: "A band you've played in, with a track or two.", href: "/me/projects", done: (projects.count ?? 0) > 0 },
    { id: "reach", title: "Connect with someone, or post on the Board", sub: "Say what you're looking for and who you'd like to play with.", href: "/board/new", done: reached },
  ];
  const done = steps.filter((s) => s.done).length;
  return done === steps.length ? null : { steps, done };
}

/** When Today has no real musicians near you yet, the last step points at search instead. */
export function nobodyNearby(state: GetStarted): GetStarted {
  return {
    ...state,
    steps: state.steps.map((s) =>
      s.id === "reach" && !s.done
        ? { ...s, title: "Find your first musician", sub: "Nobody new near you yet. Search everyone, or invite a bandmate from your profile.", href: "/search" }
        : s,
    ),
  };
}
