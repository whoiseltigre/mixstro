"use client";

import { useState } from "react";
import type { ParsedClip } from "@/lib/clips";

/** Shows a lightweight poster first and loads the real player only on tap. */
export function ClipCard({ clip, onRemove }: { clip: ParsedClip; onRemove?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const tall = clip.provider === "tiktok";

  return (
    <div className={`relative shrink-0 rounded-2xl overflow-hidden bg-stage ${tall ? "w-[150px] aspect-[9/16]" : "w-[260px] aspect-video"}`}>
      {playing ? (
        <iframe
          src={`${clip.embed}${clip.embed.includes("?") ? "&" : "?"}autoplay=1`}
          title={clip.provider === "youtube" ? "YouTube clip" : "TikTok clip"}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label="Play clip" className="absolute inset-0 flex items-center justify-center">
          {clip.provider === "youtube" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clip.thumb} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="absolute inset-0" style={{ background: "linear-gradient(160deg, #292624, #0F0D0B)" }} />
          )}
          <span className="relative glass size-12 rounded-full flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
          </span>
          <span className="absolute left-2 bottom-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ink/60">
            {clip.provider === "youtube" ? "YouTube" : "TikTok"}
          </span>
        </button>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove clip" className="absolute right-2 top-2 glass size-7 rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}
