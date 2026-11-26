"use client";

import { useState, useTransition } from "react";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BackButton, Button, Chip, Field, TextArea, ToggleRow } from "@/components/ui";
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
  const [step, setStep] = useState(0);
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
    // Enter in a field on an earlier step moves on; only the last step posts.
    if (step < 2) return setStep(step + 1);
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

  const steps = ["What are you looking for?", kind === "collab" ? "Who would you write with?" : "Who do you need?", "Say it in your words"];
  const noun = FAMILIES.find((f) => f.id === needed)?.noun;
  const suggestion = noun ? `${noun[0].toUpperCase()}${noun.slice(1)} wanted` : "";
  const last = step === steps.length - 1;
  const next = () => {
    // Coming into the last step, start the title from what was picked so the box is never blank.
    if (step === 1 && !title.trim() && suggestion) setTitle(suggestion);
    setStep(step + 1);
  };

  return (
    <main className="min-h-dvh md:min-h-0 pt-safe md:pt-6 px-5 md:px-0 pb-[calc(max(env(safe-area-inset-bottom),16px)+88px)] md:pb-16 md:max-w-[560px] md:mx-auto">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="mt-2 flex items-center gap-3">
          {step === 0 ? <BackButton href="/board" /> : <BackButton onClick={() => setStep(step - 1)} />}
          <div className="flex-1 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((t, i) => (
              <span key={t} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-gel-blue" : "bg-paper/12"}`} />
            ))}
          </div>
          <span className="text-footnote text-smoke tabular-nums w-10 text-right">
            {step + 1} of {steps.length}
          </span>
        </div>

        <h1 key={step} className="headline text-display-sm md:text-display text-pretty rise-in">{steps[step]}</h1>

        {step === 0 && (
          <div className="flex flex-col gap-3" role="radiogroup" aria-label="Kind of post">
            {KINDS.map((k) => {
              const on = kind === k;
              const c = CHOICES[k];
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setKind(k);
                    setStep(1);
                  }}
                  className="press-card relative overflow-hidden rounded-card-lg p-4 min-h-[96px] flex items-center gap-4 text-left border transition"
                  style={{ borderColor: on ? c.hue : "rgb(245 241 236 / 0.1)", background: `linear-gradient(120deg, color-mix(in srgb, ${c.hue} ${on ? 26 : 14}%, var(--color-stage)), var(--color-stage) 70%)` }}
                >
                  <span className="size-14 rounded-card flex items-center justify-center shrink-0 text-ink" style={{ background: c.hue }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {c.icon}
                    </svg>
                  </span>
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-body-lg font-semibold">{c.title}</span>
                    <span className="text-subhead text-paper/75 text-pretty">{c.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 &&
          (kind !== "collab" ? (
            <>
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">Who you need</legend>
                <div className="grid grid-cols-3 gap-2.5">
                  {FAMILIES.map((f) => {
                    const on = needed === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setNeeded(on ? undefined : f.id)}
                        className={`press h-[92px] rounded-card flex flex-col items-center justify-center gap-1.5 text-footnote font-semibold border transition ${on ? "bg-paper text-ink border-paper" : "bg-stage border-paper/10 text-paper"}`}
                      >
                        <InstrumentIcon family={f.id} size={28} />
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-footnote text-smoke text-pretty">We&rsquo;ll show you nearby musicians who play it, and let them know you&rsquo;re looking.</p>
              </fieldset>
              {needed && (
                <>
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
                </>
              )}
            </>
          ) : (
            <Field id="role" label="Who you need" placeholder={hint.role} value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} />
          ))}

        {step === 2 && (
          <>
            <Field id="title" label="Headline" placeholder={hint.title} value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} />
            <TextArea id="details" label="Details" value={details} maxLength={1000} rows={4} onChange={(e) => setDetails(e.target.value)} placeholder={hint.details} />
            <Field id="where" label="Where" placeholder="Echo Park, Los Angeles" value={where} maxLength={80} onChange={(e) => setWhere(e.target.value)} />
            <div className="flex flex-col gap-3">
              <ToggleRow on={paid} onChange={setPaid}>It&rsquo;s paid</ToggleRow>
              {paid && <Field id="pay" label="Pay (optional)" placeholder="$300/day" value={pay} maxLength={40} onChange={(e) => setPay(e.target.value)} />}
            </div>
            <Field
              id="closes"
              label={kind === "session" ? "Date (optional)" : "Closes on (optional)"}
              hint={needed ? (kind === "session" ? "It closes after this date." : "It stays up 14 days unless you pick a date. You can renew it.") : undefined}
              type="date"
              min={today}
              value={closesOn}
              onChange={(e) => setClosesOn(e.target.value)}
            />
          </>
        )}

        {error && <p role="alert" className="text-subhead text-danger-soft">{error}</p>}

        {step > 0 && (
          <div className="fixed md:static z-20 inset-x-0 bottom-0 px-5 md:px-0 pt-6 pb-[max(env(safe-area-inset-bottom),16px)] md:p-0 bg-[linear-gradient(180deg,transparent,var(--color-ink)_38%)] md:bg-none">
            {last ? (
              <Button key="post" type="submit" disabled={pending || title.trim().length < 3}>
                {pending ? "Posting…" : "Post to the Board"}
              </Button>
            ) : (
              <Button key="next" type="button" onClick={next}>
                {kind !== "collab" && !needed ? "Skip" : "Continue"}
              </Button>
            )}
          </div>
        )}
      </form>
    </main>
  );
}

const CHOICES: Record<BoardKind, { title: string; sub: string; hue: string; icon: React.ReactNode }> = {
  band_seeking: {
    title: "A band member",
    sub: "Your band has an open spot: a drummer, a singer, a sub.",
    hue: "var(--color-gel-blue)",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19c.6-3.2 3-5 6-5s5.4 1.800 6 5M17 8v6M14 11h6" />
      </>
    ),
  },
  session: {
    title: "Someone for a session or gig",
    sub: "A date, a studio day, a paid show. One job, then done.",
    hue: "var(--color-gel-teal)",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
  },
  collab: {
    title: "Someone to write with",
    sub: "Co-writes, features, remote collabs. No band needed.",
    hue: "var(--color-gel-pink)",
    icon: (
      <>
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="M13.5 6.5l4 4" />
      </>
    ),
  },
};
