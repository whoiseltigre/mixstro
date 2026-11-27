"use client";

import { useEffect, useState } from "react";
import { answerSurvey, surveyDue } from "@/app/(app)/pmf-actions";

const CHECKED = "mixstro:survey-checked-until";
const DAY = 24 * 60 * 60 * 1000;

const ANSWERS = [
  { id: "very", label: "Very disappointed" },
  { id: "somewhat", label: "Somewhat disappointed" },
  { id: "not", label: "Not disappointed" },
] as const;

/**
 * Two weeks after signup, once: "How would you feel if you could no longer use Mixstro?"
 * Checks the server at most once a day per device; "Not now" waits three days.
 */
export function PmfSurvey() {
  const [show, setShow] = useState(false);
  const [answer, setAnswer] = useState<(typeof ANSWERS)[number]["id"]>();
  const [instead, setInstead] = useState("");
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (Number(localStorage.getItem(CHECKED) ?? 0) > Date.now()) return;
      localStorage.setItem(CHECKED, String(Date.now() + DAY));
    } catch {
      return; // No storage: don't risk asking on every page.
    }
    // Let the page settle before asking anything.
    const t = setTimeout(() => surveyDue().then(setShow).catch(() => {}), 4000);
    return () => clearTimeout(t);
  }, []);

  const later = () => {
    setShow(false);
    try {
      localStorage.setItem(CHECKED, String(Date.now() + 3 * DAY));
    } catch {}
  };

  async function send() {
    if (!answer) return;
    setBusy(true);
    const r = await answerSurvey(answer, instead);
    setBusy(false);
    if (r.error) return setError(r.error);
    setThanks(true);
    setTimeout(() => setShow(false), 1800);
  }

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="survey-title">
      <button type="button" aria-label="Not now" onClick={later} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />
      <div className="relative w-full md:max-w-[460px] rounded-t-sheet md:rounded-sheet bg-stage border border-paper/10 px-5 pt-6 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-5">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[-60px] -translate-x-1/2 w-[320px] h-[160px] rounded-full opacity-30 blur-[70px] pointer-events-none"
          style={{ background: "radial-gradient(#FFB245, transparent 70%)" }}
        />
        {thanks ? (
          <p className="relative text-title4 font-semibold py-6 text-center">Thank you. That really helps.</p>
        ) : (
          <>
            <div className="relative flex flex-col gap-1.5">
              <span className="text-caption font-semibold tracking-[0.14em] uppercase text-gel-peach">Quick question</span>
              <h2 id="survey-title" className="text-title2 font-semibold leading-tight text-balance">
                How would you feel if you could no longer use Mixstro?
              </h2>
            </div>
            <div className="relative flex flex-col gap-2" role="radiogroup" aria-labelledby="survey-title">
              {ANSWERS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={answer === a.id}
                  onClick={() => setAnswer(a.id)}
                  className={`h-12 rounded-2xl px-4 text-left text-body border transition ${
                    answer === a.id ? "bg-paper text-ink border-paper font-semibold" : "border-paper/15 hover:border-paper/40"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {answer && (
              <label className="relative flex flex-col gap-2">
                <span className="text-subhead text-smoke">What would you use instead? (optional)</span>
                <input
                  value={instead}
                  onChange={(e) => setInstead(e.target.value)}
                  maxLength={280}
                  placeholder="Facebook groups, Craigslist, friends…"
                  className="field field-inset h-[52px] px-4 text-body"
                />
              </label>
            )}
            {error && <p role="alert" className="relative text-footnote text-danger">{error}</p>}
            <div className="relative flex gap-2.5">
              <button type="button" onClick={later} className="h-12 flex-1 rounded-full border border-paper/16 text-callout font-semibold hover:border-paper/40">
                Not now
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!answer || busy}
                className="h-12 flex-1 rounded-full bg-paper text-ink text-callout font-semibold disabled:opacity-40"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
