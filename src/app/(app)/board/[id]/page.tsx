import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonPhoto } from "@/components/person-photo";
import { TimeAgo } from "@/components/time-ago";
import { BackButton } from "@/components/ui";
import { getPost, type BoardPost } from "@/lib/board";
import type { Musician } from "@/lib/mock";
import { AnswerForm, ClosePostButton } from "./answer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const view = await getPost((await params).id);
  return { title: view ? `${view.post.title} · The Board` : "The Board · Mixstro" };
}

const KIND_COLOR: Record<string, string> = { "Band seeking": "#B5C5FF", Session: "#67E2DA", Collab: "#FFACBA" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const view = await getPost((await params).id);
  if (!view) notFound();
  const { post } = view;

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:max-w-[680px] md:mx-auto">
      <div className="mt-2 flex items-center gap-2.5">
        <BackButton href="/board" />
        <span className="text-[15px] text-smoke">The Board</span>
      </div>

      <PostHeader post={post} />

      {view.kind === "mine" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">
            {view.replies.length ? `${view.replies.length} answered` : "No answers yet"}
          </h2>
          {view.replies.length === 0 && <p className="text-[15px] text-smoke">When musicians answer, their profiles land here and at the top of your Today.</p>}
          <ul className="flex flex-col gap-2.5">
            {view.replies.map((r) => (
              <li key={r.id}>
                <PersonRow person={r.person} note={r.note} at={r.createdAt} />
              </li>
            ))}
          </ul>
          <ClosePostButton postId={Number(post.id)} />
        </section>
      )}

      {view.kind === "theirs" && (
        <AnswerForm postId={Number(post.id)} authorId={post.author.id} authorName={post.author.name} me={view.me} answered={Boolean(post.answered)} myNote={view.myNote} />
      )}

      {view.kind === "sample" && (
        <p className="rounded-[20px] bg-stage p-4 text-[14px] text-smoke">This is a sample post. Real posts near you show up alongside it.</p>
      )}
    </main>
  );
}

function PostHeader({ post }: { post: BoardPost }) {
  const color = KIND_COLOR[post.kind] ?? "#FFB245";
  return (
    <section className="rounded-[26px] overflow-hidden bg-stage">
      {post.photo && (
        <div className="relative h-[180px] md:h-[220px]">
          <Image src={post.photo} alt={post.alt ?? ""} fill sizes="680px" className="object-cover" />
        </div>
      )}
      <div className="p-5 md:p-6 flex flex-col gap-3" style={{ background: `radial-gradient(120% 120% at 0% 0%, ${color}24, transparent 60%)` }}>
        <span className="self-start h-6 px-2.5 rounded-full text-[11px] font-bold tracking-[0.08em] uppercase text-ink flex items-center" style={{ background: color }}>
          {post.kind}
        </span>
        <h1 className="headline text-[28px] md:text-[34px] leading-[1.1]">{post.title}</h1>
        <p className="text-[15px] text-smoke">
          {[post.meta, post.distanceMi !== undefined ? `${post.distanceMi} mi away` : null].filter(Boolean).join(" · ")}
        </p>
        {post.details && <p className="text-[16px] leading-[1.5] whitespace-pre-line">{post.details}</p>}
        <div className="pt-1 flex items-center justify-between gap-3 text-[13px] text-smoke">
          {post.mine ? (
            <span>Your post</span>
          ) : (
            <Link href={`/m/${post.author.username}`} className="flex items-center gap-2.5 hover:text-paper transition">
              <span className="relative size-8 rounded-full overflow-hidden shrink-0">
                <PersonPhoto person={post.author} sizes="32px" initialsSize={12} />
              </span>
              Posted by <span className="font-semibold text-paper">{post.author.name}</span>
            </Link>
          )}
          {post.createdAt && <TimeAgo iso={post.createdAt} />}
        </div>
      </div>
    </section>
  );
}

function PersonRow({ person: m, note, at }: { person: Musician; note: string | null; at: string }) {
  return (
    <Link href={`/m/${m.username}`} className="flex gap-3.5 p-3.5 rounded-[20px] bg-stage hover:bg-riser transition">
      <span className="relative size-14 rounded-full overflow-hidden shrink-0">
        <PersonPhoto person={m} sizes="56px" initialsSize={20} />
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-semibold">{m.name}</span>
          <TimeAgo iso={at} className="text-[12px] text-smoke" />
        </span>
        <span className="text-[13px] text-smoke truncate">
          {m.instrument} · {m.genres} · {m.neighborhood}
          {m.distanceMi ? ` · ${m.distanceMi} mi` : ""}
        </span>
        {m.shared.length > 0 && (
          <span className="text-[13px] text-tungsten">
            Also into {m.shared.slice(0, 3).map((a) => a.name).join(", ")}
          </span>
        )}
        {note && <span className="mt-1 text-[15px] leading-[1.45]">&ldquo;{note}&rdquo;</span>}
      </span>
    </Link>
  );
}
