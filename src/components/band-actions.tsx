"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sendBandNote } from "@/app/(app)/bands/actions";
import { Sheet, useSheetClose } from "@/components/sheet";
import { toast } from "@/components/toast";
import { Button, cx } from "@/components/ui";

/**
 * The buttons under a band's name. Members get the band chat and Your band; everyone else
 * can write to the band (it lands in their chat with your profile) and share the page.
 */
export function BandActions({ id, name, url, signedIn, isMember }: { id: string; name: string; url: string; signedIn: boolean; isMember: boolean }) {
  const [writing, setWriting] = useState(false);
  const pill = "h-12 rounded-full flex items-center justify-center gap-2 text-[16px] font-semibold transition active:scale-[0.98]";

  return (
    <div className="flex items-center gap-2.5 max-w-[520px]">
      {isMember ? (
        <>
          <Link href={`/messages/b/${id}`} className={cx(pill, "flex-1 bg-paper text-ink hover:bg-white")}>
            <ChatIcon />
            Band chat
          </Link>
          <Link href={`/bands/${id}`} className={cx(pill, "flex-1 glass hover:bg-paper/10")}>
            Your band
          </Link>
        </>
      ) : signedIn ? (
        <button type="button" onClick={() => setWriting(true)} className={cx(pill, "flex-1 bg-paper text-ink hover:bg-white")}>
          <ChatIcon />
          Message the band
        </button>
      ) : (
        <Link href="/" className={cx(pill, "flex-1 bg-paper text-ink hover:bg-white")}>
          <ChatIcon />
          Message the band
        </Link>
      )}
      <ShareButton name={name} url={url} />
      {writing && <NoteSheet id={id} name={name} onClose={() => setWriting(false)} />}
    </div>
  );
}

function ShareButton({ name, url }: { name: string; url: string }) {
  async function share() {
    const data = { title: `${name} on Mixstro`, text: `${name} on Mixstro`, url };
    try {
      if (navigator.share) return await navigator.share(data);
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast(url);
    }
  }
  return (
    <button type="button" onClick={share} aria-label={`Share ${name}`} className="glass size-12 rounded-full flex items-center justify-center shrink-0 hover:bg-paper/10 transition active:scale-[0.96]">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 15V3M7.5 7.5L12 3l4.5 4.5" />
        <path d="M8 10.5H6.5A1.5 1.5 0 005 12v7.5A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5V12a1.5 1.5 0 00-1.5-1.5H16" />
      </svg>
    </button>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5h16a1 1 0 011 1v10a1 1 0 01-1 1h-9l-4.5 3.5v-3.5H4a1 1 0 01-1-1v-10a1 1 0 011-1z" />
    </svg>
  );
}

function NoteSheet({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  return (
    <Sheet
      onClose={onClose}
      labelledBy="note-title"
      scrimClassName="bg-ink/70 backdrop-blur-sm"
      className="md:max-w-[460px] rounded-t-[32px] md:rounded-[32px] bg-stage border border-paper/10 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-3"
    >
      <NoteForm id={id} name={name} />
    </Sheet>
  );
}

function NoteForm({ id, name }: { id: string; name: string }) {
  const close = useSheetClose();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        start(async () => {
          const res = await sendBandNote(id, text);
          if (res.error) return setError(res.error);
          toast(`Sent to ${name}`);
          close();
        });
      }}
    >
      <h2 id="note-title" className="font-display text-[24px] font-bold tracking-[-0.02em]">
        Write to {name}
      </h2>
      <p className="text-[14px] text-smoke -mt-1.5">Everyone in the band sees it in their band chat, with your profile and music.</p>
      <label htmlFor="band-note" className="sr-only">
        Your note
      </label>
      <textarea
        id="band-note"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={4}
        placeholder="Loved the set at the Echo. I play drums, any chance you need a fill-in?"
        className="rounded-2xl bg-ink/60 border border-paper/12 p-4 text-[16px] leading-[1.45] placeholder:text-smoke/60 outline-none focus:border-paper/50 resize-none"
      />
      {error && (
        <p role="alert" className="text-[13px] text-[#FF453A]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || text.trim().length < 2} className="h-12 disabled:opacity-50">
        {pending ? "Sending…" : "Send to the band"}
      </Button>
    </form>
  );
}
