import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/people";
import { getPublicOpening } from "@/lib/public-opening";
import { OpeningView, headline } from "./view";

/**
 * A shared opening: app.mixstro.com/o/<id>. Anyone with the link sees what's needed, roughly
 * where, when they rehearse, what they sound like, and whether it's still open, and can
 * answer in one step. Only what the poster chose to share is here.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const o = await getPublicOpening((await params).id);
  if (!o) return { title: "Mixstro", robots: { index: false } };
  const title = `${headline(o)}${o.area ? ` in ${o.area}` : ""} · Mixstro`;
  const description = [o.title, o.rehearsal_days.length ? `Rehearses ${o.rehearsal_days.join("/")}.` : null, "Listen and answer on Mixstro."].filter(Boolean).join(" ");
  return { title, description, robots: { index: false }, openGraph: { title, description }, twitter: { card: "summary", title, description } };
}

export default async function OpeningPage({ params }: Params) {
  const { id } = await params;
  const o = await getPublicOpening(id);
  if (!o) notFound();
  const viewer = await getViewer();
  let answered = false;
  if (viewer) {
    // Across a block the opening simply isn't there for you.
    const { data: blocked } = await viewer.supabase.rpc("is_blocked", { a: viewer.id, b: o.author.id });
    if (blocked) notFound();
    const { data } = await viewer.supabase.from("board_replies").select("id").eq("post_id", o.id).eq("from_id", viewer.id).maybeSingle();
    answered = Boolean(data);
  }
  return <OpeningView o={o} signedIn={Boolean(viewer)} own={viewer?.id === o.author.id} answered={answered} />;
}
