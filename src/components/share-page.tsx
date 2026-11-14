"use client";

import { useEffect, useState } from "react";
import { BRAND_PATHS } from "./brand-icons";
import { Sheet, SheetCloser } from "./sheet";

type Props = {
  username: string;
  firstName: string;
  /** Your own page: the copy speaks as you. */
  mine: boolean;
  /** The public link, e.g. https://app.mixstro.com/@sundy */
  url: string;
  className?: string;
  label?: string;
  variant?: "solid" | "glass";
};

/**
 * Share a music page. Phones get the native share sheet with the story card attached
 * (that's how it reaches Instagram and TikTok stories); every platform with a share
 * link gets a direct button; and anyone can copy the link or save the card.
 */
export function SharePage({ username, firstName, mine, url, className = "", label, variant = "glass" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  const story = `/p/${username}/story`;
  const text = mine ? "My music, and every band I've played in. Come say hi on Mixstro." : `Have a listen to ${firstName}'s music on Mixstro.`;

  useEffect(() => {
    if (!open) return;
    try {
      const probe = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(Boolean(navigator.canShare?.({ files: [probe] })));
    } catch {
      setCanShareFiles(false);
    }
  }, [open]);

  async function storyFile() {
    const blob = await (await fetch(story)).blob();
    return new File([blob], `${username}-mixstro.png`, { type: "image/png" });
  }

  /** The system share sheet, with the story card when the device takes files. */
  async function nativeShare() {
    try {
      if (canShareFiles) await navigator.share({ files: [await storyFile()], text: `${text} ${url}` });
      else await navigator.share({ title: `${firstName} on Mixstro`, text, url });
    } catch {
      // Cancelled.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const links = [
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: "x", label: "X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { id: "threads", label: "Threads", href: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: "reddit", label: "Reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
  ] as const;

  const hasNative = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-12 rounded-full px-5 text-[16px] font-semibold inline-flex items-center justify-center gap-2 transition ${
          variant === "solid" ? "bg-paper text-ink hover:bg-paper/90" : "bg-paper/10 border border-paper/14 backdrop-blur hover:bg-paper/16"
        } ${className}`}
      >
        <ShareIcon />
        {label ?? (mine ? "Share your page" : "Share")}
      </button>

      {open && (
        <Sheet
          onClose={() => setOpen(false)}
          labelledBy="share-title"
          scrimClassName="bg-ink/70 backdrop-blur-sm"
          className="md:max-w-[520px] max-h-[92dvh] overflow-y-auto rounded-t-[28px] md:rounded-[28px] bg-stage border border-paper/10 px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-5"
        >
          <SheetCloser>{(close) => (<>
            <div className="flex items-center justify-between">
              <h2 id="share-title" className="text-[20px] font-semibold">
                {mine ? "Share your music page" : `Share ${firstName}'s page`}
              </h2>
              <button type="button" onClick={close} aria-label="Close" className="hit-slop relative size-9 rounded-full bg-paper/8 flex items-center justify-center hover:bg-paper/14">
                <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" /></svg>
              </button>
            </div>

            <div className="flex gap-4 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story} alt="Your story card" width={108} height={192} className="w-[108px] h-[192px] rounded-[14px] bg-riser object-cover shrink-0 border border-paper/10" />
              <div className="flex flex-col gap-2.5 min-w-0">
                <p className="text-[14px] text-smoke leading-snug">
                  {mine ? "A story card for Instagram and TikTok, and a link that plays your music for anyone, no account needed." : "Anyone can open the link and play their music, no account needed."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {hasNative && (
                    <button type="button" onClick={nativeShare} className="h-10 rounded-full px-4 bg-paper text-ink text-[14px] font-semibold inline-flex items-center gap-2">
                      <Mark id="instagram" size={15} />
                      {canShareFiles ? "Share to a story" : "Share"}
                    </button>
                  )}
                  <a href={story} download={`${username}-mixstro.png`} className="h-10 rounded-full px-4 border border-paper/16 text-[14px] font-semibold inline-flex items-center hover:border-paper/40">
                    Save card
                  </a>
                </div>
              </div>
            </div>

            <ul className="grid grid-cols-4 gap-y-4 gap-x-2">
              {links.map((l) => (
                <li key={l.id}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 group">
                    <span className="size-12 rounded-full bg-paper/8 flex items-center justify-center transition group-hover:bg-paper/16">
                      <Mark id={l.id} size={20} />
                    </span>
                    <span className="text-[12px] text-smoke">{l.label}</span>
                  </a>
                </li>
              ))}
              <li>
                <button type="button" onClick={copy} className="w-full flex flex-col items-center gap-1.5 group">
                  <span className="size-12 rounded-full bg-paper/8 flex items-center justify-center transition group-hover:bg-paper/16">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
                  </span>
                  <span className="text-[12px] text-smoke" aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
                </button>
              </li>
            </ul>

            <p className="text-[13px] text-smoke truncate">{url.replace(/^https:\/\//, "")}</p>
          </>)}</SheetCloser>
        </Sheet>
      )}
    </>
  );
}

function Mark({ id, size }: { id: keyof typeof BRAND_PATHS; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={BRAND_PATHS[id]} />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}
