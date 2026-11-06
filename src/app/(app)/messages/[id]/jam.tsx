"use client";

import { useState, useTransition } from "react";
import { Button, Field } from "@/components/ui";
import { CHECKIN_AFTER_MS, type Jam } from "@/lib/jams";
import { answerJam, checkInJam, proposeJam } from "../../actions";

const CAL = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB245" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

/** "Thu, Nov 6 · 7:00 PM" in the viewer's own timezone. */
export function jamWhen(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/** An .ics file so an accepted jam lands in Apple, Google or Outlook calendars. */
function downloadIcs(jam: Jam, withName: string) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  const start = new Date(jam.startsAt);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mixstro//Jam//EN",
    "BEGIN:VEVENT",
    `UID:jam-${jam.id}@mixstro.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`Jam with ${withName}`)}`,
    `LOCATION:${esc(jam.place)}`,
    ...(jam.note ? [`DESCRIPTION:${esc(jam.note)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `jam-with-${withName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The invite card in the chat, Partiful-style: when, where, and what you can do about it. */
export function JamCard({ jam, first, onAnotherTime }: { jam: Jam; first: string; onAnotherTime: (jam: Jam) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });

  const closed = jam.status === "declined" || jam.status === "replaced" || jam.status === "cancelled";
  if (closed) {
    const line =
      jam.status === "replaced" ? "Moved to another time" : jam.status === "cancelled" ? "Invite cancelled" : jam.mine ? `${first} can't make it` : "You couldn't make it";
    return (
      <div className={`${jam.mine ? "self-end" : "self-start"} text-[13px] text-smoke px-3 py-1.5 rounded-full border border-paper/10`} suppressHydrationWarning>
        <span className="line-through">{jamWhen(jam.startsAt)}</span> · {line}
      </div>
    );
  }

  const checkinOpen = jam.status === "accepted" && Date.now() > new Date(jam.startsAt).getTime() + CHECKIN_AFTER_MS;

  return (
    <div className={`${jam.mine ? "self-end" : "self-start"} w-[272px] rounded-[20px] bg-stage p-3.5 flex flex-col gap-2.5 border border-paper/10`}>
      <div className="flex items-center gap-2">
        {CAL}
        <span className="text-[14px] font-semibold">{jam.status === "accepted" ? "Jam's on" : "Jam session"}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[16px] font-semibold" suppressHydrationWarning>
          {jamWhen(jam.startsAt)}
        </span>
        <span className="text-[14px] text-smoke">{jam.place}</span>
        {jam.note && <span className="text-[14px] leading-[1.4] pt-1">{jam.note}</span>}
      </div>

      {jam.status === "proposed" &&
        (jam.mine ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-smoke">Waiting on {first}</span>
            <button type="button" disabled={pending} onClick={() => run(() => answerJam(jam.id, "cancelled"))} className="text-[13px] text-smoke underline underline-offset-2">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => answerJam(jam.id, "accepted"))}
                className="flex-1 h-9 rounded-full bg-paper text-ink text-[14px] font-semibold disabled:opacity-50"
              >
                I&apos;m in
              </button>
              <button type="button" disabled={pending} onClick={() => onAnotherTime(jam)} className="flex-1 h-9 rounded-full border border-paper/20 text-[14px] disabled:opacity-50">
                Another time
              </button>
            </div>
            <button type="button" disabled={pending} onClick={() => run(() => answerJam(jam.id, "declined"))} className="self-center text-[13px] text-smoke">
              Can&apos;t make it
            </button>
          </div>
        ))}

      {jam.status === "accepted" && !checkinOpen && (
        <button type="button" onClick={() => downloadIcs(jam, first)} className="h-9 rounded-full border border-paper/20 text-[14px] font-medium">
          Add to calendar
        </button>
      )}

      {checkinOpen && jam.played === null && (
        <div className="flex flex-col gap-2 pt-1 border-t border-paper/10">
          <span className="text-[14px] pt-2">Did you end up playing together?</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => checkInJam(jam.id, true))}
              aria-label="Yes, we played"
              className="flex-1 h-9 rounded-full bg-paper text-ink text-[16px] disabled:opacity-50"
            >
              👍
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => checkInJam(jam.id, false))}
              aria-label="No, it didn't happen"
              className="flex-1 h-9 rounded-full border border-paper/20 text-[16px] disabled:opacity-50"
            >
              👎
            </button>
          </div>
          <span className="text-[12px] text-smoke">Only you see your answer until {first} answers too.</span>
        </div>
      )}
      {checkinOpen && jam.played !== null && (
        <span className="text-[13px] pt-2 border-t border-paper/10 text-smoke">
          {jam.outcome === "played"
            ? "You both said you played together."
            : jam.outcome === "not_played"
              ? "Didn't happen this time. Plan another?"
              : `Thanks. You'll both see how it went once ${first} answers.`}
        </span>
      )}
      {error && <span className="text-[12px] text-[#FF453A]">{error}</span>}
    </div>
  );
}

/** Tomorrow at 7 PM, in local time, as the datetime-local inputs want it. */
function defaultWhen() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: "19:00" };
}

/** The sheet for proposing a jam, or suggesting another time for one they sent. */
export function PlanJamSheet({
  connectionId,
  first,
  replacing,
  onClose,
  onSent,
}: {
  connectionId: number;
  first: string;
  replacing: Jam | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [{ date, time }, setWhen] = useState(defaultWhen);
  const [place, setPlace] = useState(replacing?.place ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime())) return setError("Pick a day and time.");
    start(async () => {
      const res = await proposeJam(connectionId, startsAt.toISOString(), place, note, replacing?.id);
      if (res.error) setError(res.error);
      else onSent();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-ink/70" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-[440px] rounded-t-[28px] md:rounded-[28px] bg-stage border border-paper/10 p-5 pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col gap-4"
        aria-labelledby="plan-jam-title"
      >
        <div className="flex items-center gap-2">
          {CAL}
          <h2 id="plan-jam-title" className="text-[20px] font-semibold tracking-[-0.01em]">
            {replacing ? "Suggest another time" : `Plan a jam with ${first}`}
          </h2>
        </div>
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <Field id="jam-date" label="Day" type="date" value={date} onChange={(e) => setWhen((w) => ({ ...w, date: e.target.value }))} required />
          <Field id="jam-time" label="Time" type="time" value={time} onChange={(e) => setWhen((w) => ({ ...w, time: e.target.value }))} required />
        </div>
        <Field id="jam-place" label="Where" placeholder="Our rehearsal space in Silver Lake" value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} required />
        <Field id="jam-note" label="Anything to bring? (optional)" placeholder="Bring your bass, we have a drum kit" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} />
        {error && <p className="text-[13px] text-[#FF453A]">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="glass" onClick={onClose} className="h-12 text-[16px]">
            Not now
          </Button>
          <Button type="submit" disabled={pending || place.trim().length < 2} className="h-12 text-[16px]">
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </form>
    </div>
  );
}
