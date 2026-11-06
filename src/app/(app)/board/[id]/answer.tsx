"use client";

import { useState, useTransition } from "react";
import { PersonPhoto } from "@/components/person-photo";
import { Button } from "@/components/ui";
import type { Musician } from "@/lib/mock";
import { answerPost, closePost } from "../actions";

/** Answer with your profile: they see your card, your music and an optional line from you. */
export function AnswerForm({
  postId,
  authorId,
  authorName,
  me,
  answered,
  myNote,
}: {
  postId: number;
  authorId: string;
  authorName: string;
  me: Musician | null;
  answered: boolean;
  myNote: string | null;
}) {
  const [note, setNote] = useState("");
  const [done, setDone] = useState(answered);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <section className="rounded-[26px] bg-stage p-5 md:p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{done ? "You answered" : "Answer with your profile"}</h2>
        <p className="text-[14px] text-smoke">
          {done
            ? `${authorName} sees your profile and your music, and you're at the top of their Today. When they Connect back, you can message.`
            : `${authorName} sees your profile, your projects and your tracks. No cold DM needed.`}
        </p>
      </div>

      {me && (
        <div className="flex items-center gap-3.5 p-3 rounded-[18px] bg-ink/50 border border-paper/8">
          <span className="relative size-12 rounded-full overflow-hidden shrink-0">
            <PersonPhoto person={me} sizes="48px" initialsSize={18} />
          </span>
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="text-[15px] font-semibold">{me.name}</span>
            <span className="text-[13px] text-smoke truncate">
              {me.instrument} · {me.genres} · {me.neighborhood}
            </span>
          </span>
        </div>
      )}

      {done ? (
        (myNote || note) && <p className="text-[15px] leading-[1.45]">&ldquo;{myNote || note}&rdquo;</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="text-[13px] font-semibold text-smoke">
              Add a line (optional)
            </label>
            <textarea
              id="note"
              value={note}
              maxLength={280}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              placeholder="I'm free most Thursdays and have my own kit."
              className="rounded-2xl bg-ink/50 border border-paper/12 px-4 py-3 text-[16px] leading-[1.45] placeholder:text-smoke/60 outline-none focus:border-paper/50 resize-none"
            />
          </div>
          {error && <p className="text-[14px] text-[#FF8A80]">{error}</p>}
          <Button
            variant="gel"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await answerPost(postId, authorId, note);
                if (res.error) setError(res.error);
                else setDone(true);
              })
            }
          >
            {pending ? "Sending…" : "Answer with my profile"}
          </Button>
        </>
      )}
    </section>
  );
}

export function ClosePostButton({ postId }: { postId: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="glass"
      className="h-12 text-[16px] mt-2"
      disabled={pending}
      onClick={() => {
        if (confirm("Close this post? It comes off the Board and no one else can answer.")) start(() => closePost(postId));
      }}
    >
      {pending ? "Closing…" : "Close post"}
    </Button>
  );
}
