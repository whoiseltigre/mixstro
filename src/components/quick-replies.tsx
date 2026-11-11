"use client";

import { useState, useTransition } from "react";
import { quickReply } from "@/app/(app)/actions";

/** #3 One-tap answers to a Connect, so a polite no is as easy as a yes. */
export function QuickReplies({
  otherId,
  username,
  first,
  note,
  onClosed,
}: {
  otherId: string;
  username: string;
  first: string;
  /** The note they sent with their Connect, shown above the answers. */
  note?: string | null;
  onClosed?: () => void;
}) {
  const [pending, start] = useTransition();
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string>();
  const tap = (kind: "jam" | "clip" | "no") =>
    start(async () => {
      const res = await quickReply(otherId, username, kind);
      if (res?.error) setError(res.error);
      else if (res?.closed) {
        setClosed(true);
        onClosed?.();
      }
    });

  if (closed) return <p className="text-[14px] text-smoke">Done. We&apos;ll let {first} know it&apos;s not the right fit, kindly.</p>;
  const chip = "h-9 px-3.5 rounded-full text-[14px] font-medium border transition disabled:opacity-50 whitespace-nowrap";
  return (
    <div className="flex flex-col gap-1.5">
      {note && (
        <p className="self-start max-w-full rounded-[18px] rounded-bl-[6px] bg-paper/10 border border-paper/12 px-3.5 py-2.5 text-[15px] leading-[1.4] mb-1">
          <span className="sr-only">{first} wrote: </span>
          {note}
        </p>
      )}
      <div className="hscroll flex gap-2" role="group" aria-label={`Quick answers to ${first}`}>
        <button type="button" disabled={pending} onClick={() => tap("jam")} className={`${chip} bg-paper text-ink border-paper font-semibold`}>
          Down to jam
        </button>
        <button type="button" disabled={pending} onClick={() => tap("clip")} className={`${chip} border-paper/25 hover:bg-paper/10`}>
          Send me a clip
        </button>
        <button type="button" disabled={pending} onClick={() => tap("no")} className={`${chip} border-paper/15 text-smoke hover:bg-paper/10`}>
          Not the right fit, good luck
        </button>
      </div>
      {error && <p className="text-[12px] text-[#FF453A]">{error}</p>}
    </div>
  );
}
