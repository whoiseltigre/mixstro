"use client";

import { useState, useTransition } from "react";
import { requestRemoval, startClaim, submitProof } from "@/app/b/[id]/claim-actions";
import { Sheet, useSheetClose } from "@/components/sheet";
import { toast } from "@/components/toast";
import { Button, Field, cx } from "@/components/ui";
import { RETURN_COOKIE } from "@/lib/return-path";
import { possessive } from "@/lib/band-shared";
import type { MyClaim, Seat } from "@/lib/band-claim";

/**
 * Claiming a band page. "This is my band" or "Claim your spot" opens a sheet with a code to post
 * on the band's official Instagram (bio, post or story) or website, then the link to it. A person
 * at Mixstro checks the code is there and approves; that makes you a member.
 */

type Target = { seat?: Seat };

function signInFirst(band: string) {
  document.cookie = `${RETURN_COOKIE}=/b/${band}; path=/; max-age=3600; samesite=lax`;
  window.location.assign("/");
}

export function ClaimButton({ band, name, signedIn, myClaim, instagramUrl, websiteUrl }: { band: string; name: string; signedIn: boolean; myClaim?: MyClaim; instagramUrl?: string; websiteUrl?: string }) {
  const [open, setOpen] = useState<Target | null>(null);
  const waiting = myClaim?.status === "pending";
  return (
    <>
      <Button
        size="md"
        className="!w-auto"
        onClick={() => (signedIn ? setOpen({}) : signInFirst(band))}
      >
        {waiting ? (myClaim?.proofUrl ? "Claim sent: we're checking" : "Finish your claim") : "This is my band"}
      </Button>
      {open && <ClaimSheet band={band} name={name} target={open} myClaim={myClaim} instagramUrl={instagramUrl} websiteUrl={websiteUrl} onClose={() => setOpen(null)} />}
    </>
  );
}

export function SeatList({ band, name, seats, signedIn, myClaim, instagramUrl, websiteUrl }: { band: string; name: string; seats: Seat[]; signedIn: boolean; myClaim?: MyClaim; instagramUrl?: string; websiteUrl?: string }) {
  const [open, setOpen] = useState<Target | null>(null);
  return (
    <>
      <ul className="flex flex-col rounded-card-lg bg-stage divide-y divide-paper/8 max-w-[620px]">
        {seats.map((s) => {
          const mine = myClaim?.status === "pending" && myClaim.seatId === s.id;
          return (
            <li key={s.id} className="flex items-center gap-3.5 px-4 py-3">
              <span className="size-10 rounded-full border-[1.5px] border-dashed border-paper/25 flex items-center justify-center text-callout font-bold text-paper/60 shrink-0" aria-hidden="true">
                {s.name.slice(0, 1)}
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-body font-semibold truncate">{s.name}</span>
                <span className="text-footnote text-smoke truncate">{s.role || "In the band"}</span>
              </span>
              {s.claimed ? (
                <span className="text-footnote font-semibold text-smoke shrink-0">Claimed</span>
              ) : (
                <button
                  type="button"
                  onClick={() => (signedIn ? setOpen({ seat: s }) : signInFirst(band))}
                  className={cx(
                    "press hit-slop relative h-9 px-3.5 rounded-full text-footnote font-semibold shrink-0 transition",
                    mine ? "bg-tungsten/16 text-tungsten" : "border border-paper/20 hover:bg-paper/8",
                  )}
                >
                  {mine ? "Your claim" : "That's me"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {open && <ClaimSheet band={band} name={name} target={open} myClaim={myClaim} instagramUrl={instagramUrl} websiteUrl={websiteUrl} onClose={() => setOpen(null)} />}
    </>
  );
}

function ClaimSheet(props: { band: string; name: string; target: Target; myClaim?: MyClaim; instagramUrl?: string; websiteUrl?: string; onClose: () => void }) {
  return (
    <Sheet
      onClose={props.onClose}
      labelledBy="claim-title"
      scrimClassName="bg-ink/70 backdrop-blur-sm"
      className="md:max-w-[480px] rounded-t-hero md:rounded-hero bg-stage border border-paper/10 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-4"
    >
      <ClaimFlow {...props} />
    </Sheet>
  );
}

function ClaimFlow({ band, name, target, myClaim, instagramUrl, websiteUrl }: { band: string; name: string; target: Target; myClaim?: MyClaim; instagramUrl?: string; websiteUrl?: string }) {
  const close = useSheetClose();
  const reuse = myClaim?.status === "pending" && (myClaim.seatId ?? "") === (target.seat?.id ?? "");
  const [code, setCode] = useState(reuse ? myClaim.code : undefined);
  const [claimId, setClaimId] = useState(reuse ? myClaim.id : undefined);
  const [proof, setProof] = useState(reuse ? (myClaim.proofUrl ?? "") : "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const where = [instagramUrl && "Instagram", websiteUrl && "website"].filter(Boolean).join(" or ") || "Instagram or website";

  function begin() {
    setError(undefined);
    start(async () => {
      const r = await startClaim(band, target.seat?.id);
      if (r.error) return setError(r.error);
      setCode(r.code);
      setClaimId(r.claimId);
    });
  }

  function send() {
    if (!claimId) return;
    setError(undefined);
    start(async () => {
      const r = await submitProof(band, claimId, proof);
      if (r.error) return setError(r.error);
      toast("Sent. We'll check it within a day.");
      close();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id="claim-title" className="headline text-title1">
          {target.seat ? `Are you ${target.seat.name}?` : `Claim ${name}`}
        </h2>
        <p className="text-subhead text-smoke text-pretty">
          {target.seat
            ? `Prove it with the band's official ${where}, and this spot becomes your profile. Your bandmates can claim theirs too.`
            : `Prove you're in the band with its official ${where}. Then the page is yours: add a photo, your music, shows and open spots.`}
        </p>
      </div>

      {!code ? (
        <Button onClick={begin} disabled={pending}>
          {pending ? "One sec…" : "Get my code"}
        </Button>
      ) : (
        <>
          <ol className="flex flex-col gap-3 text-callout">
            <li className="flex flex-col gap-2">
              <span>
                <b>1.</b> Post this code on {possessive(name)} official {where}: in the bio, a post or a story. You can take it down once we&apos;ve checked.
              </span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(code).then(() => toast("Code copied"), () => undefined)}
                className="press self-start h-12 px-5 rounded-tile bg-ink border border-tungsten/40 font-mono text-title3 tracking-[0.12em] text-tungsten"
                aria-label={`Copy code ${code}`}
              >
                {code}
              </button>
              <span className="flex gap-3 text-footnote">
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 text-smoke hover:text-paper">
                    Open their Instagram
                  </a>
                )}
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 text-smoke hover:text-paper">
                    Open their website
                  </a>
                )}
              </span>
            </li>
            <li className="flex flex-col gap-2">
              <span>
                <b>2.</b> Paste the link to where you posted it.
              </span>
              <Field id="claim-proof" label="Link" type="url" inputMode="url" placeholder="https://instagram.com/…" value={proof} onChange={(e) => setProof(e.target.value)} />
            </li>
          </ol>
          <Button onClick={send} disabled={pending || !proof.trim()}>
            {pending ? "Sending…" : "Send for checking"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-footnote text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function RemoveLink({ band, name }: { band: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-footnote text-smoke underline underline-offset-4 hover:text-paper self-start">
        Remove this page
      </button>
      {open && (
        <Sheet
          onClose={() => setOpen(false)}
          labelledBy="remove-title"
          scrimClassName="bg-ink/70 backdrop-blur-sm"
          className="md:max-w-[460px] rounded-t-hero md:rounded-hero bg-stage border border-paper/10 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-3"
        >
          <RemoveForm band={band} name={name} />
        </Sheet>
      )}
    </>
  );
}

function RemoveForm({ band, name }: { band: string; name: string }) {
  const close = useSheetClose();
  const [contact, setContact] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        start(async () => {
          const r = await requestRemoval(band, contact, reason);
          if (r.error) return setError(r.error);
          toast("Thanks. We'll take it down within a day.");
          close();
        });
      }}
    >
      <h2 id="remove-title" className="headline text-title1">
        Remove {possessive(name)} page?
      </h2>
      <p className="text-subhead text-smoke -mt-1.5 text-pretty">No account needed. We take unclaimed pages down within a day, no questions asked.</p>
      <Field id="remove-contact" label="How to reach you (optional)" placeholder="Email or @handle" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} />
      <label htmlFor="remove-reason" className="text-footnote font-semibold text-smoke">
        Anything we should know (optional)
      </label>
      <textarea id="remove-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} className="field field-inset p-4 text-body leading-[1.45] resize-none" />
      {error && (
        <p role="alert" className="text-footnote text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Ask to remove it"}
      </Button>
    </form>
  );
}
