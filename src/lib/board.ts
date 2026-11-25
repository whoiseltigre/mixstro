import { BOARD, findMusician } from "./mock";
import { SHOW_SAMPLES, getMusicians, getViewer, locate, type Viewer } from "./people";
import type { Musician } from "./mock";
import { myClips, openingCandidates, toOpening, type CandidateView, type MyClip, type Opening, type OpeningRow } from "./openings";

/**
 * The Board: bands, sessions and collabs post open spots, and musicians answer with their
 * profile instead of a cold DM. Real posts come from board_posts; sample posts from mock.ts
 * fill it out while Mixstro is small (same NEXT_PUBLIC_SAMPLE_PEOPLE switch as Today).
 */

import { KIND_LABEL, type BoardKind } from "./board-kinds";
export { KIND_LABEL, KINDS, type BoardKind } from "./board-kinds";

export type BoardAuthor = Pick<Musician, "id" | "username" | "name" | "photo" | "photoAlt" | "instrument">;

export type BoardPost = {
  /** The board_posts id, or "s-1" for a sample. */
  id: string;
  sample?: boolean;
  kind: string;
  title: string;
  role?: string;
  details?: string;
  neighborhood?: string;
  paid: boolean;
  pay?: string;
  closesOn?: string;
  createdAt?: string;
  closed?: boolean;
  isNew: boolean;
  author: BoardAuthor;
  /** A sample's stock photo; real posts show the author's photo. */
  photo?: string;
  alt?: string;
  distanceMi?: number;
  mine: boolean;
  /** How many people answered. Only on your own posts. */
  replies?: number;
  answered?: boolean;
  /** The one-line summary under the title, and the small line under that. */
  meta: string;
  foot: string;
  /** Set when the post is a structured opening (needed role, days, expiry). */
  opening?: Opening;
};

type PostRow = OpeningRow & {
  id: number;
  author_id: string;
  kind: BoardKind;
  title: string;
  role: string | null;
  details: string | null;
  neighborhood: string | null;
  paid: boolean;
  pay: string | null;
  closes_on: string | null;
  closed_at: string | null;
  created_at: string;
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

function samples(viewer?: Viewer | null): BoardPost[] {
  if (!SHOW_SAMPLES) return [];
  return BOARD.map((p) => {
    const m = findMusician(p.author)!;
    return {
      id: `s-${p.id}`,
      sample: true,
      kind: p.kind,
      title: p.title,
      paid: /paid|\$/i.test(p.meta),
      isNew: viewer ? false : p.isNew,
      author: { id: m.id, username: m.username, name: m.name, photo: m.photo, photoAlt: m.photoAlt, instrument: m.instrument },
      photo: p.photo,
      alt: p.alt,
      // Samples are set in Los Angeles. A real musician sees them as samples: no distance, no made-up interest.
      distanceMi: viewer ? undefined : m.distanceMi,
      mine: false,
      meta: p.meta,
      foot: viewer ? "Sample post" : p.foot,
    };
  });
}

function closesLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  const days = Math.round((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Closes today";
  if (days < 7) return `Closes ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
  return `Closes ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function toPost(row: PostRow, author: Musician | undefined, viewer: Viewer, extra: { replies?: number; answered?: boolean }): BoardPost {
  const mine = row.author_id === viewer.id;
  const where = row.neighborhood ?? author?.neighborhood;
  const days = row.needed_role && row.rehearsal_days?.length ? row.rehearsal_days.join("/") : null;
  const meta = [where, row.role, days, row.paid ? row.pay || "Paid" : null].filter(Boolean).join(" · ");
  const foot = mine
    ? extra.replies
      ? `${extra.replies} musician${extra.replies === 1 ? "" : "s"} answered`
      : "No answers yet"
    : extra.answered
      ? "You answered"
      : row.closes_on
        ? closesLabel(row.closes_on)
        : `Posted by ${author?.name ?? "a musician"}`;
  return {
    id: String(row.id),
    kind: KIND_LABEL[row.kind],
    title: row.title,
    role: row.role ?? undefined,
    details: row.details ?? undefined,
    neighborhood: where ?? undefined,
    paid: row.paid,
    pay: row.pay ?? undefined,
    closesOn: row.closes_on ?? undefined,
    createdAt: row.created_at,
    closed: Boolean(row.closed_at),
    isNew: Date.now() - new Date(row.created_at).getTime() < WEEK,
    author: author
      ? { id: author.id, username: author.username, name: author.name, photo: author.photo, photoAlt: author.photoAlt, instrument: author.instrument }
      : { id: row.author_id, username: "", name: "A musician", photo: null, photoAlt: "Musician", instrument: "Musician" },
    distanceMi: mine ? undefined : author?.distanceMi,
    mine,
    replies: mine ? (extra.replies ?? 0) : undefined,
    answered: extra.answered,
    meta,
    foot,
    opening: toOpening(row),
  };
}

async function decorate(viewer: Viewer, rows: PostRow[]): Promise<BoardPost[]> {
  if (!rows.length) return [];
  const others = [...new Set(rows.map((r) => r.author_id).filter((id) => id !== viewer.id))];
  const [authors, counts, mineAnswered] = await Promise.all([
    getMusicians(viewer, others),
    viewer.supabase.rpc("my_board_reply_counts"),
    viewer.supabase.from("board_replies").select("post_id").eq("from_id", viewer.id).in("post_id", rows.map((r) => r.id)),
  ]);
  const self = viewer.profile
    ? ({
        id: viewer.id,
        username: viewer.profile.username,
        name: viewer.profile.first_name,
        photo: viewer.profile.avatar_url,
        photoAlt: `${viewer.profile.first_name}'s photo`,
        instrument: viewer.profile.main_instrument ?? viewer.profile.instruments[0] ?? "Musician",
        neighborhood: viewer.profile.neighborhood ?? "",
      } as Musician)
    : undefined;
  const replyCount = new Map(((counts.data ?? []) as { post_id: number; replies: number }[]).map((c) => [c.post_id, c.replies]));
  const answered = new Set(((mineAnswered.data ?? []) as { post_id: number }[]).map((r) => r.post_id));
  return rows.map((r) =>
    toPost(r, r.author_id === viewer.id ? self : authors.find((a) => a.id === r.author_id), viewer, {
      replies: replyCount.get(r.id),
      answered: answered.has(r.id),
    }),
  );
}

export type BoardView = {
  posts: BoardPost[];
  /** "Echo Park · within 25 mi", or a generic line in demo mode. */
  area: string;
  demo: boolean;
};

/** Open posts near you (your radius; posts whose distance we don't know yet stay in), newest first, then samples. */
export async function getBoard(): Promise<BoardView> {
  const viewer = await getViewer();
  if (!viewer) return { posts: samples(), area: "Los Angeles · within 25 mi", demo: true };
  const today = new Date().toISOString().slice(0, 10);
  // Saving your location and fetching posts don't depend on each other; distances need both.
  const [{ data }] = await Promise.all([
    viewer.supabase
      .from("board_posts")
      // "*" so opening fields come along once that migration is in, without breaking before.
      .select("*")
      .is("closed_at", null)
      .or(`closes_on.is.null,closes_on.gte.${today}`)
      .order("created_at", { ascending: false })
      .limit(150),
    locate(viewer),
  ]);
  const radius = viewer.profile?.radius_mi ?? 25;
  const now = new Date().toISOString();
  const posts = (await decorate(viewer, (data ?? []) as PostRow[]))
    // An opening past its expiry is gone even before the 15-minute job marks it expired.
    .filter((p) => !p.opening?.expiresAt || p.opening.expiresAt > now)
    .filter((p) => p.mine || p.distanceMi === undefined || p.distanceMi <= radius);
  const hood = viewer.profile?.neighborhood?.split(",")[0]?.trim();
  return { posts: [...posts, ...samples(viewer)], area: hood ? `${hood} · within ${radius} mi` : `Within ${radius} mi`, demo: false };
}

export type Reply = { id: number; person: Musician; note: string | null; createdAt: string };

export type PostView =
  | { kind: "sample"; post: BoardPost }
  | { kind: "theirs"; post: BoardPost; me: Musician | null; myNote: string | null }
  | { kind: "mine"; post: BoardPost; replies: Reply[]; candidates?: CandidateView; clips?: MyClip[] };

/** One post. The author also sees who answered; everyone else sees whether they already did. */
export async function getPost(id: string): Promise<PostView | null> {
  if (id.startsWith("s-")) {
    const post = samples().find((p) => p.id === id);
    return post ? { kind: "sample", post } : null;
  }
  const viewer = await getViewer();
  if (!viewer || !/^\d+$/.test(id)) return null;
  // "*" so band_id comes along once bands v2 is in, without breaking before.
  const { data } = await viewer.supabase.from("board_posts").select("*").eq("id", Number(id)).maybeSingle<PostRow & { band_id?: number | null }>();
  if (!data) return null;
  const [post] = await decorate(viewer, [data]);
  // A band's open spot: everyone in the band sees who answered, like the member who posted it.
  const bandMember = !post.mine && data.band_id ? Boolean((await viewer.supabase.rpc("is_band_member", { p_band: data.band_id })).data) : false;

  if (post.mine || bandMember) {
    const { data: rows } = await viewer.supabase
      .from("board_replies")
      .select("id, from_id, note, created_at")
      .eq("post_id", data.id)
      .order("created_at", { ascending: false });
    const list = (rows ?? []) as { id: number; from_id: string; note: string | null; created_at: string }[];
    const people = await getMusicians(viewer, list.map((r) => r.from_id));
    const [candidates, clips] = post.opening ? await Promise.all([openingCandidates(viewer, data.id, post.opening), myClips(viewer)]) : [undefined, undefined];
    return {
      kind: "mine",
      candidates,
      clips,
      post: bandMember ? { ...post, mine: true, replies: list.length, foot: `${list.length} musician${list.length === 1 ? "" : "s"} answered` } : post,
      replies: list.flatMap((r) => {
        const person = people.find((p) => p.id === r.from_id);
        return person ? [{ id: r.id, person, note: r.note, createdAt: r.created_at }] : [];
      }),
    };
  }

  const [{ data: mine }, [me]] = await Promise.all([
    viewer.supabase.from("board_replies").select("note").eq("post_id", data.id).eq("from_id", viewer.id).maybeSingle<{ note: string | null }>(),
    getMusicians(viewer, [viewer.id]),
  ]);
  return { kind: "theirs", post: { ...post, answered: Boolean(mine) }, me: me ?? null, myNote: mine?.note ?? null };
}
