"use client";

import { useState, useTransition } from "react";
import { BackButton, Button, Chip, Field, ToggleRow } from "@/components/ui";
import { KIND_LABEL, KINDS, type BoardKind } from "@/lib/board-kinds";
import { FAMILIES } from "@/lib/instruments";
import { createPost } from "../actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RADII = [5, 10, 15, 25];

const HINTS: Record<BoardKind, { title: string; role: string; details: string }> = {
  band_seeking: { title: "Drummer for a neo-soul trio", role: "Drummer", details: "We gig about once a month and rehearse Thursdays in Echo Park. Into D'Angelo, Hiatus Kaiyote." },
  session: { title: "Rhythm guitar for an EP", role: "Rhythm guitar", details: "Three days at a studio in Studio City. Charts provided." },
  collab: { title: "Co-writer, folk and ambient", role: "Songwriter", details: "Remote is fine. I have a pile of half-finished songs." },
};

export function NewPostForm({ neighborhood, signedIn, myRole }: { neighborhood: string; signedIn: boolean; myRole?: string }) {
  const [kind, setKind] = useState<BoardKind>("band_seeking");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [details, setDetails] = useState("");
  const [where, setWhere] = useState(neighborhood);
  const [paid, setPaid] = useState(false);
  const [pay, setPay] = useState("");
  const [closesOn, setClosesOn] = useState("");
  const [needed, setNeeded] = useState<string>();
  const [offered, setOffered] = useState<string | undefined>(myRole);
  const [days, setDays] = useState<string[]>([]);
  const [radius, setRadius] = useState(15);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const hint = HINTS[kind];
  const today = new Date().toISOString().slice(0, 10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) return setError("Sign in to post on the Board.");
    start(async () => {
      const res = await createPost({
        kind,
        title,
        role: role || (needed ? (FAMILIES.find((f) => f.id === needed)?.label ?? needed) : ""),
        details,
        neighborhood: where,
        paid,
        pay,
        closesOn,
        neededRole: kind === "collab" ? undefined : needed,
        offeredRole: offered,
        days,
        radiusMi: radius,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 md:max-w-[680px] md:mx-auto">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="mt-2 flex items-center gap-2.5">
          <BackButton href="/board" />
          <h1 className="headline text-title-lg md:text-display">New post</h1>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="text-footnote font-semibold text-smoke mb-2.5">What are you looking for?</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
                {KIND_LABEL[k]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Field id="title" label="Title" placeholder={hint.title} value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} />

        {kind !== "collab" ? (
          <>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="text-footnote font-semibold text-smoke mb-2.5">Who you need</legend>
              <div className="flex flex-wrap gap-2">
                {FAMILIES.map((f) => (
                  <Chip key={f.id} selected={needed === f.id} onClick={() => setNeeded(needed === f.id ? undefined : f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
              <p className="text-footnote text-smoke">We&rsquo;ll show you nearby musicians who play it, and let them know you&rsquo;re looking.</p>
            </fieldset>
            {needed && (
              <>
                <fieldset className="flex flex-col gap-2.5">
                  <legend className="text-footnote font-semibold text-smoke mb-2.5">You play</legend>
                  <div className="flex flex-wrap gap-2">
                    {FAMILIES.map((f) => (
                      <Chip key={f.id} selected={offered === f.id} onClick={() => setOffered(offered === f.id ? undefined : f.id)}>
                        {f.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="flex flex-col gap-2.5">
                  <legend className="text-footnote font-semibold text-smoke mb-2.5">Days you usually rehearse</legend>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => (
                      <Chip key={d} selected={days.includes(d)} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}>
                        {d}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="flex flex-col gap-2.5">
                  <legend className="text-footnote font-semibold text-smoke mb-2.5">How far they can be</legend>
                  <div className="flex flex-wrap gap-2">
                    {RADII.map((r) => (
                      <Chip key={r} selected={radius === r} onClick={() => setRadius(r)}>
                        {r} mi
                      </Chip>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </>
        ) : (
          <Field id="role" label="Who you need" placeholder={hint.role} value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} />
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="details" className="text-footnote font-semibold text-smoke">
            Details
          </label>
          <textarea
            id="details"
            value={details}
            maxLength={1000}
            rows={4}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={hint.details}
            className="field px-4 py-3 text-body-lg leading-[1.45] resize-none"
          />
        </div>

        <Field id="where" label="Where" placeholder="Echo Park, Los Angeles" value={where} maxLength={80} onChange={(e) => setWhere(e.target.value)} />

        <div className="flex flex-col gap-3">
          <ToggleRow on={paid} onChange={setPaid}>It&rsquo;s paid</ToggleRow>
          {paid && <Field id="pay" label="Pay (optional)" placeholder="$300/day" value={pay} maxLength={40} onChange={(e) => setPay(e.target.value)} />}
        </div>

        <Field
          id="closes"
          label={kind === "session" ? "Date (optional)" : "Closes on (optional)"}
          hint={needed ? (kind === "session" ? "It closes after this date." : "It stays up 14 days unless you pick a date. You can renew it.") : undefined}
          type="date" min={today} value={closesOn} onChange={(e) => setClosesOn(e.target.value)} />

        {error && <p className="text-subhead text-danger-soft">{error}</p>}
        <Button type="submit" disabled={pending || title.trim().length < 3}>
          {pending ? "Posting…" : "Post to the Board"}
        </Button>
      </form>
    </main>
  );
}
