"use client";

import { useState } from "react";
import { BackButton, Button } from "@/components/ui";
import { sendFeedback } from "../../pmf-actions";

/** Settings > Send feedback. Goes straight to the Mixstro team. */
export default function Feedback() {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    const r = await sendFeedback(body);
    setBusy(false);
    if (r.error) return setError(r.error);
    setSent(true);
    setBody("");
  }

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-5 md:max-w-[680px] md:mx-auto">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/settings" />
        <h1 className="headline text-[28px]">Send feedback</h1>
      </header>
      {sent ? (
        <section className="flex flex-col gap-3 p-5 rounded-[20px] bg-stage">
          <p className="text-[17px] font-semibold">Got it, thank you.</p>
          <p className="text-[14px] text-smoke">We read every note. If something&apos;s broken, we&apos;ll get on it.</p>
          <button type="button" onClick={() => setSent(false)} className="self-start text-[15px] font-semibold underline underline-offset-2">
            Send another
          </button>
        </section>
      ) : (
        <>
          <p className="text-[15px] text-smoke text-pretty">
            Something broken, confusing, or missing? An idea for Mixstro? Tell us here. It goes straight to the people building it.
          </p>
          <label htmlFor="feedback" className="sr-only">Your feedback</label>
          <textarea
            id="feedback"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={7}
            placeholder="What's on your mind?"
            className="rounded-[20px] bg-stage border border-paper/12 p-4 text-[16px] leading-[1.5] placeholder:text-smoke outline-none focus:border-paper/40 resize-none"
          />
          {error && <p role="alert" className="text-[13px] text-[#FF453A]">{error}</p>}
          <Button onClick={send} disabled={busy || body.trim().length < 2} className="h-12 text-[16px]">
            {busy ? "Sending…" : "Send"}
          </Button>
        </>
      )}
    </main>
  );
}
