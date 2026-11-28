"use client";

import { HighlightList } from "@/components/profile-extras";
import { useMyExtras } from "@/lib/extras-store";
import { OPEN_TO } from "@/lib/open-to";
import Link from "next/link";
import { ArtistAvatar } from "@/components/artist-avatar";
import { ClipCard } from "@/components/clip-card";
import { ProjectList } from "@/components/project-list";
import { ButtonLink, ChevronRight, GearIcon, PencilIcon, VerifiedMark } from "@/components/ui";
import { parseClip } from "@/lib/clips";
import { useMyProjects } from "@/lib/projects-store";
import { useEffect, useRef, useState } from "react";
import { SharePage } from "@/components/share-page";
import { BandInvites } from "@/components/band-invites";
import { MyBands } from "@/components/my-bands";
import { COMMITMENT, savePhoto, useDraft } from "@/lib/onboarding";
import { shrinkPhoto } from "@/lib/photo";
import { useVerification } from "@/lib/verification";

export default function Me() {
  const { draft, update, ready } = useDraft();
  const { verified } = useVerification();
  const projects = useMyProjects();
  const extras = useMyExtras();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!ready) return null;

  if (!draft.firstName) {
    return (
      <main className="min-h-dvh md:min-h-[calc(100dvh-88px)] px-5 md:px-0 pt-safe flex flex-col justify-center gap-4 md:max-w-[480px] md:mx-auto">
        <h1 className="headline text-display">No profile yet</h1>
        <p className="text-smoke">
          Set up your profile to start meeting musicians.
        </p>
        <ButtonLink href="/onboarding/basics">Set up my profile</ButtonLink>
      </main>
    );
  }

  const handle = draft.username.replace(/^@/, "");
  const hasClips = draft.clips.some((c) => c.kind === "clip");

  return (
    <main className="md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:grid md:grid-cols-[minmax(280px,360px)_1fr] md:gap-x-10 lg:gap-x-14 md:items-start">
      {/* Your profile the way other musicians see it. Every part you can change has a pencil on it;
          Settings is the gear. From 768px the photo and basics stay pinned on the left. */}
      <div className="flex flex-col gap-5 md:sticky md:top-[96px]">
        <div className="relative -mx-5 md:mx-0">
          <PhotoPicker url={draft.avatarUrl} name={draft.firstName} onSaved={(avatarUrl) => update({ avatarUrl })} />
          <div className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] md:top-3 md:right-3 flex gap-2">
            <Link href="/onboarding/basics" aria-label="Edit profile" className="glass-thick size-11 rounded-full flex items-center justify-center">
              <PencilIcon size={17} />
            </Link>
            <Link href="/settings" aria-label="Settings" className="glass-thick size-11 rounded-full flex items-center justify-center">
              <GearIcon size={20} />
            </Link>
          </div>
          <div className="pointer-events-none absolute inset-x-5 md:inset-x-4 bottom-4 flex flex-col gap-1">
            <span className="text-caption font-semibold tracking-[0.12em] uppercase text-gel-pink truncate">
              {[draft.instruments[0], draft.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
            </span>
            <h1 className="headline text-display md:text-display-sm flex items-center gap-2">
              {draft.firstName}
              {verified && <VerifiedMark size={22} className="text-paper" />}
            </h1>
            <span className="text-subhead text-paper/75">@{handle}</span>
          </div>
        </div>

        <p className="text-callout text-paper/85 text-pretty">
          {[draft.instruments.join(", "), COMMITMENT[draft.commitment], draft.neighborhood && `${draft.neighborhood}, within ${draft.radiusMi} mi`].filter(Boolean).join(" · ")}
        </p>

        {origin && (
          <div className="flex gap-2.5">
            <SharePage username={handle} firstName={draft.firstName} mine url={`${origin}/@${handle}`} variant="solid" className="flex-1" />
            <ButtonLink href={`/@${handle}`} variant="glass" size="md" className="shrink-0">
              View page
            </ButtonLink>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-7 md:gap-9 min-w-0">
        <BandInvites />
        {projects.ready && <MyBands projects={projects.projects} />}
        {extras.ready && <OpenToPicker selected={extras.openTo} onToggle={extras.toggleOpenTo} />}

        {hasClips ? (
          <section className="flex flex-col gap-3">
            <SectionHead title="Songs and clips" href="/onboarding/sound" label="Edit your songs and clips" />
            <div className="hscroll flex gap-2.5 -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap items-start">
              {draft.clips.map((c) => {
                const p = c.kind === "clip" ? parseClip(c.value) : null;
                return p ? <ClipCard key={c.value} clip={p} /> : null;
              })}
            </div>
          </section>
        ) : (
          <AddSlot href="/onboarding/sound" hue="var(--color-tungsten)" title="Add a song" sub="Musicians listen before they reply. Paste a link or record 30 seconds." icon={<path d="M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm11-2a3 3 0 11-6 0 3 3 0 016 0z" />} />
        )}

        {projects.ready && (
          <ProjectList
            projects={projects.projects}
            editHref="/me/projects"
            empty={<AddSlot href="/me/projects" hue="var(--color-gel-blue)" title="Show what you've played in" sub="Every band and project, old or new. Type your artist name and we'll find your releases." icon={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /></>} />}
          />
        )}

        {extras.ready &&
          (extras.highlights.length > 0 ? (
            <div className="relative">
              <HighlightList items={extras.highlights} />
              <EditDot href="/me/highlights" label="Edit highlights" className="absolute right-0 -top-2" />
            </div>
          ) : (
            <AddSlot href="/me/highlights" hue="var(--color-gel-peach)" title="Add your highlights" sub="A release, a show you're proud of, press, an award. What you'd want someone to know first." icon={<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8z" />} />
          ))}

        {draft.influences.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionHead title="Influences" href="/onboarding/influences?from=profile" label="Edit influences" />
            <div className="hscroll flex gap-4 -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap">
              {draft.influences.map((a) => (
                <div key={a.id} className="w-[80px] shrink-0 flex flex-col items-center gap-2">
                  <ArtistAvatar artist={a} size={76} />
                  <span className="text-caption font-semibold text-center truncate max-w-full">{a.name}</span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <AddSlot href="/onboarding/influences?from=profile" hue="var(--color-gel-violet)" title="Add your influences" sub="So we can introduce musicians who love the same artists." icon={<path d="M12 20s-7-4.4-7-9.5A4 4 0 0112 8a4 4 0 017 2.5C19 15.6 12 20 12 20z" />} />
        )}

        {draft.goals.length === 0 && (
          <AddSlot href="/onboarding/why" hue="var(--color-gel-teal)" title="Say what you're here for" sub="Finding bandmates, gigs, or showing off your music." icon={<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" /></>} />
        )}

        <Link href="/me/network" className="flex items-center gap-3 p-4 rounded-card-lg bg-stage border border-paper/8 transition hover:border-paper/40">
          <span className="flex-1 flex flex-col gap-0.5">
            <span className="text-callout font-semibold">Your network</span>
            <span className="text-footnote text-smoke">Your connections, and people you may know through your bands.</span>
          </span>
          <ChevronRight />
        </Link>
      </div>
    </main>
  );
}

function SectionHead({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-title3 font-semibold tracking-[-0.01em]">{title}</h2>
      <EditDot href={href} label={label} />
    </div>
  );
}

/** The pencil: the one way to change a part of your profile, always top right of that part. */
function EditDot({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={`glass size-11 rounded-full flex items-center justify-center shrink-0 ${className}`}>
      <PencilIcon />
    </Link>
  );
}

/** A part of your profile that's still empty, shown where it will live. One place per gap, no separate to-do list. */
function AddSlot({ href, hue, title, sub, icon }: { href: string; hue: string; title: string; sub: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="press-card flex items-center gap-3.5 p-4 rounded-card-lg border border-dashed border-paper/25 transition hover:border-paper/50">
      <span className="size-12 rounded-field flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${hue} 16%, transparent)`, color: hue }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <span className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="text-callout font-semibold">{title}</span>
        <span className="text-footnote text-smoke text-pretty">{sub}</span>
      </span>
      <span className="size-8 rounded-full bg-paper/10 flex items-center justify-center shrink-0" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </span>
    </Link>
  );
}

/** "Open to": tap to say what you're up for right now. Saves on tap and shows on your profile. */
function OpenToPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => Promise<{ error?: string }> }) {
  const [error, setError] = useState("");
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title3 font-semibold tracking-[-0.01em]">Open to</h2>
        <p className="text-footnote text-smoke">Shows on your profile, so the right people reach out.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPEN_TO.map((o) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={async () => setError((await onToggle(o.id)).error ?? "")}
              className="press h-11 px-4 rounded-full text-subhead inline-flex items-center gap-1.5 border"
              style={on ? { borderColor: o.color, background: `color-mix(in srgb, ${o.color} 18%, transparent)`, color: o.color, fontWeight: 600 } : { borderColor: "rgb(245 241 236 / 0.25)" }}
            >
              {on && <span className="size-1.5 rounded-full" style={{ background: o.color }} aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-footnote text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

/** Your photo, full width like everyone else sees it. Tap "Change photo" to swap it; it uploads and saves straight away. */
function PhotoPicker({ url, name, onSaved }: { url?: string; name: string; onSaved: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const r = await savePhoto(await shrinkPhoto(file));
      if (r.url) onSaved(r.url);
      else setError(r.error ?? "Try again.");
    } catch {
      setError("That photo didn't open. Try a JPEG or PNG.");
    }
    setBusy(false);
  }

  return (
    <div className="relative h-[430px] md:h-auto md:aspect-[9/10] md:rounded-sheet overflow-hidden bg-riser">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" referrerPolicy="no-referrer" className={`absolute inset-0 size-full object-cover object-[50%_28%] transition ${busy ? "opacity-40" : ""}`} />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center headline text-paper/15" style={{ fontSize: 140, background: "radial-gradient(90% 70% at 50% 0%, rgb(255 172 186 / 0.35), transparent 75%)" }}>
          {name[0]?.toUpperCase()}
        </span>
      )}
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_13_11/0.35),transparent_28%,transparent_48%,rgb(15_13_11/0.96))]" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="press absolute left-5 md:left-3 top-[max(env(safe-area-inset-top),16px)] md:top-3 glass-thick h-11 px-4 rounded-full flex items-center gap-2 text-subhead font-semibold"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        {busy ? "Saving…" : url ? "Change photo" : "Add a photo"}
      </button>
      {error && <span role="alert" className="absolute left-5 top-[calc(max(env(safe-area-inset-top),16px)+52px)] glass-thick px-3 py-1.5 rounded-full text-footnote">{error}</span>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
