"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REPORT_REASONS, type ReportReason, blockUser, reportUser } from "@/lib/safety";
import { Button } from "./ui";

type View = "closed" | "menu" | "block" | "report" | "reported";

/** The "…" button on a profile or chat: block or report someone (#11). */
export function SafetyMenu({ username, name }: { username: string; name: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("closed");
  const [reason, setReason] = useState<ReportReason>();
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const first = name.split(" ")[0];

  async function block() {
    setBusy(true);
    const { error } = await blockUser(username);
    setBusy(false);
    if (error) return setError(error);
    router.push("/discover");
  }

  async function report() {
    if (!reason) return;
    setBusy(true);
    const { error } = await reportUser(username, reason, details);
    setBusy(false);
    if (error) return setError(error);
    setView("reported");
  }

  return (
    <>
      <button type="button" aria-label={`More options for ${first}`} onClick={() => setView("menu")} className="glass size-10 rounded-full flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {view !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Safety options">
          <button type="button" aria-label="Close" onClick={() => setView("closed")} className="absolute inset-0 bg-ink/60" />
          <div className="relative w-full max-w-[440px] glass rounded-t-[28px] px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col gap-3">
            {view === "menu" && (
              <>
                <SheetButton onClick={() => setView("report")}>Report {first}</SheetButton>
                <SheetButton danger onClick={() => setView("block")}>Block {first}</SheetButton>
                <SheetButton onClick={() => setView("closed")}>Cancel</SheetButton>
              </>
            )}

            {view === "block" && (
              <>
                <h2 className="text-[20px] font-semibold">Block {first}?</h2>
                <p className="text-[15px] text-smoke text-pretty">
                  You won&apos;t see each other in Today, search, the Board, or Messages. {first} isn&apos;t told.
                </p>
                <Button onClick={block} disabled={busy} variant="danger">Block</Button>
                <Button variant="glass" onClick={() => setView("menu")}>Back</Button>
              </>
            )}

            {view === "report" && (
              <>
                <h2 className="text-[20px] font-semibold">What&apos;s wrong?</h2>
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="Reason">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={reason === r.id}
                      onClick={() => setReason(r.id)}
                      className={`h-12 px-4 rounded-2xl text-left text-[15px] border transition ${reason === r.id ? "bg-paper text-ink border-paper font-semibold" : "border-paper/16"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <label htmlFor="report-details" className="sr-only">Details</label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Anything else we should know? (optional)"
                  rows={2}
                  className="rounded-2xl bg-stage border border-paper/12 px-4 py-3 text-[16px] placeholder:text-smoke/60 outline-none focus:border-paper/50"
                />
                <Button onClick={report} disabled={!reason || busy}>Send report</Button>
              </>
            )}

            {view === "reported" && (
              <>
                <h2 className="text-[20px] font-semibold">Thanks for telling us</h2>
                <p className="text-[15px] text-smoke text-pretty">We review every report. {first} won&apos;t know it was you. Want to block them too?</p>
                <Button onClick={block} disabled={busy} variant="danger">Block {first}</Button>
                <Button variant="glass" onClick={() => setView("closed")}>Done</Button>
              </>
            )}
            {error && <p role="alert" className="text-[13px] text-[#FF453A]">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

function SheetButton({ children, danger, onClick }: { children: React.ReactNode; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`h-14 rounded-2xl bg-stage text-[17px] font-semibold ${danger ? "text-[#FF453A]" : ""}`}>
      {children}
    </button>
  );
}
