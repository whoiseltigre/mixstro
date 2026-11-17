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
      <div className="relative w-full md:max-w-[460px] rounded-t-[28px] md:rounded-[28px] bg-stage border border-paper/10 px-5 pt-6 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-5">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[-60px] -translate-x-1/2 w-[320px] h-[160px] rounded-full opacity-30 blur-[70px] pointer-events-none"
          style={{ background: "radial-gradient(#FFB245, transparent 70%)" }}
        />
        {thanks ? (
          <p className="relative text-[18px] font-semibold py-6 text-center">Thank you. That really helps.</p>
        ) : (
          <>
            <div className="relative flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold tracking-[0.14em] uppercase text-tungsten">Quick question</span>
              <h2 id="survey-title" className="text-[22px] font-semibold leading-tight text-balance">
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
                  className={`h-12 rounded-2xl px-4 text-left text-[16px] border transition ${
                    answer === a.id ? "bg-tungsten text-ink border-tungsten font-semibold" : "border-paper/15 hover:border-paper/40"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {answer && (
              <label className="relative flex flex-col gap-2">
                <span className="text-[14px] text-smoke">What would you use instead? (optional)</span>
                <input
                  value={instead}
                  onChange={(e) => setInstead(e.target.value)}
                  maxLength={280}
                  placeholder="Facebook groups, Craigslist, friends…"
                  className="h-12 rounded-2xl bg-ink border border-paper/12 px-4 text-[16px] placeholder:text-smoke/70 outline-none focus:border-paper/50"
                />
              </label>
            )}
            {error && <p role="alert" className="relative text-[13px] text-[#FF453A]">{error}</p>}
            <div className="relative flex gap-2.5">
              <button type="button" onClick={later} className="h-12 flex-1 rounded-full border border-paper/16 text-[15px] font-semibold hover:border-paper/40">
                Not now
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!answer || busy}
                className="h-12 flex-1 rounded-full bg-paper text-ink text-[15px] font-semibold disabled:opacity-40"
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
