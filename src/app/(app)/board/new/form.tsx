"use client";

import { useState, useTransition } from "react";
import { BackButton, Button, Chip, Field } from "@/components/ui";
import { KIND_LABEL, KINDS, type BoardKind } from "@/lib/board-kinds";
import { createPost } from "../actions";

const HINTS: Record<BoardKind, { title: string; role: string; details: string }> = {
  band_seeking: { title: "Drummer for a neo-soul trio", role: "Drummer", details: "We gig about once a month and rehearse Thursdays in Echo Park. Into D'Angelo, Hiatus Kaiyote." },
  session: { title: "Rhythm guitar for an EP", role: "Rhythm guitar", details: "Three days at a studio in Studio City. Charts provided." },
  collab: { title: "Co-writer, folk and ambient", role: "Songwriter", details: "Remote is fine. I have a pile of half-finished songs." },
};

export function NewPostForm({ neighborhood, signedIn }: { neighborhood: string; signedIn: boolean }) {
  const [kind, setKind] = useState<BoardKind>("band_seeking");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [details, setDetails] = useState("");
  const [where, setWhere] = useState(neighborhood);
  const [paid, setPaid] = useState(false);
  const [pay, setPay] = useState("");
  const [closesOn, setClosesOn] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const hint = HINTS[kind];
  const today = new Date().toISOString().slice(0, 10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) return setError("Sign in to post on the Board.");
    start(async () => {
      const res = await createPost({ kind, title, role, details, neighborhood: where, paid, pay, closesOn });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 md:max-w-[680px] md:mx-auto">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="mt-2 flex items-center gap-2.5">
          <BackButton href="/board" />
          <h1 className="headline text-[28px] md:text-[34px]">New post</h1>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-[13px] font-semibold text-smoke mb-2.5">What are you looking for?</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
                {KIND_LABEL[k]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Field id="title" label="Title" placeholder={hint.title} value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} />
        <Field id="role" label="Who you need" placeholder={hint.role} value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} />

        <div className="flex flex-col gap-2">
          <label htmlFor="details" className="text-[13px] font-semibold text-smoke">
            Details
          </label>
          <textarea
            id="details"
            value={details}
            maxLength={1000}
            rows={4}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={hint.details}
            className="rounded-2xl bg-stage border border-paper/12 px-4 py-3 text-[17px] leading-[1.45] placeholder:text-smoke/60 outline-none focus:border-paper/50 resize-none"
          />
        </div>

        <Field id="where" label="Where" placeholder="Echo Park, Los Angeles" value={where} maxLength={80} onChange={(e) => setWhere(e.target.value)} />

        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 h-[52px] rounded-2xl bg-stage border border-paper/12 px-4 cursor-pointer">
            <span className="text-[17px]">It&rsquo;s paid</span>
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-5 accent-[#FFB245]" />
          </label>
          {paid && <Field id="pay" label="Pay (optional)" placeholder="$300/day" value={pay} maxLength={40} onChange={(e) => setPay(e.target.value)} />}
        </div>

        <Field id="closes" label="Closes on (optional)" type="date" min={today} value={closesOn} onChange={(e) => setClosesOn(e.target.value)} />

        {error && <p className="text-[14px] text-[#FF8A80]">{error}</p>}
        <Button type="submit" disabled={pending || title.trim().length < 3}>
          {pending ? "Posting…" : "Post to the Board"}
        </Button>
      </form>
    </main>
  );
}
