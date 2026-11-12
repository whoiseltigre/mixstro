"use client";

import { HighlightList } from "@/components/profile-extras";
import { useMyExtras } from "@/lib/extras-store";
import { OPEN_TO } from "@/lib/open-to";
import Link from "next/link";
import { ArtistAvatar } from "@/components/artist-avatar";
import { ClipCard } from "@/components/clip-card";
import { ProjectList } from "@/components/project-list";
import { ButtonLink, ChevronRight, VerifiedMark } from "@/components/ui";
import { parseClip } from "@/lib/clips";
import { useMyProjects } from "@/lib/projects-store";
import { useEffect, useRef, useState } from "react";
import { SharePage } from "@/components/share-page";
import { BandInvites } from "@/components/band-invites";
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
        <h1 className="headline text-[34px]">No profile yet</h1>
        <p className="text-smoke">
          Set up your profile to start meeting musicians.
        </p>
        <ButtonLink href="/onboarding/basics">Set up my profile</ButtonLink>
      </main>
    );
  }

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-6 md:grid md:grid-cols-[minmax(280px,360px)_1fr] md:gap-x-10 lg:gap-x-14 md:items-start">
      {/* From 768px the photo and basics stay pinned on the left while the rest scrolls on the right. */}
      <div className="flex flex-col gap-6 md:sticky md:top-[96px]">
        <div className="mt-6 md:mt-0 flex items-center md:items-start md:flex-col gap-4 md:gap-5">
          <PhotoPicker url={draft.avatarUrl} onSaved={(avatarUrl) => update({ avatarUrl })} />
          <div className="flex flex-col gap-0.5 md:gap-1.5">
            <h1 className="headline text-[32px] md:text-[44px] flex items-center gap-1.5">
              {draft.firstName}
              {verified && <VerifiedMark size={22} className="text-paper" />}
            </h1>
            <span className="text-[14px] md:text-[15px] text-smoke">
              @{draft.username.replace(/^@/, "")}
            </span>
          </div>
        </div>
        {origin && (
          <SharePage
            username={draft.username.replace(/^@/, "")}
            firstName={draft.firstName}
            mine
            url={`${origin}/@${draft.username.replace(/^@/, "")}`}
            variant="solid"
            className="w-full"
          />
        )}
        <dl className="grid grid-cols-2 gap-2.5">
          <Fact label="Plays" value={draft.instruments.join(", ")} />
          <Fact label="Genres" value={draft.genres.join(", ")} />
          <Fact label="Commitment" value={COMMITMENT[draft.commitment]} />
          <Fact
            label="Where"
            value={`${draft.neighborhood} · ${draft.radiusMi} mi`}
          />
        </dl>
      </div>
      <div className="flex flex-col gap-6 md:gap-8 min-w-0">
        <BandInvites />
        {extras.ready && <OpenToPicker selected={extras.openTo} onToggle={extras.toggleOpenTo} />}
        <FinishProfile
          hasInfluences={draft.influences.length > 0}
          hasTrack={draft.clips.some((c) => c.kind === "clip")}
          hasProjects={!projects.ready || projects.projects.length > 0}
          hasGoals={draft.goals.length > 0}
        />
        {projects.ready && (
          <ProjectList
            projects={projects.projects}
            editHref="/me/projects"
            empty={
              <Link href="/me/projects" className="flex flex-col gap-1 p-4 rounded-[18px] border border-dashed border-paper/20 transition hover:border-paper/40">
                <span className="text-[15px] font-semibold">Show what you&apos;ve played in</span>
                <span className="text-[13px] text-smoke">Every band and project, old or new, with a track or two from each.</span>
              </Link>
            }
          />
        )}
        {extras.ready &&
          (extras.highlights.length > 0 ? (
            <div className="flex flex-col gap-2">
              <HighlightList items={extras.highlights} />
              <Link href="/me/highlights" className="self-start text-[14px] font-semibold underline underline-offset-2">
                Edit highlights
              </Link>
            </div>
          ) : (
            <Link href="/me/highlights" className="flex flex-col gap-1 p-4 rounded-[18px] border border-dashed border-paper/20 transition hover:border-paper/40">
              <span className="text-[15px] font-semibold">Add your highlights</span>
              <span className="text-[13px] text-smoke">A release, a show you&apos;re proud of, press, an award. What you&apos;d want someone to know first.</span>
            </Link>
          ))}
        <Link href="/me/network" className="flex items-center gap-3 p-4 rounded-[18px] bg-stage border border-paper/8 transition hover:border-paper/40">
          <span className="flex-1 flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Your network</span>
            <span className="text-[13px] text-smoke">Your connections, and people you may know through your bands.</span>
          </span>
          <ChevronRight />
        </Link>
        {draft.influences.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[17px] font-semibold">Influences</h2>
            <div className="hscroll flex gap-4 -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap">
              {draft.influences.map((a) => (
                <div
                  key={a.id}
                  className="w-[80px] shrink-0 flex flex-col items-center gap-2"
                >
                  <ArtistAvatar artist={a} size={76} />
                  <span className="text-[12px] font-semibold text-center truncate max-w-full">
                    {a.name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
        {draft.clips.some((c) => c.kind === "clip") && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[17px] font-semibold">Clips</h2>
            <div className="hscroll flex gap-2.5 -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap items-start">
              {draft.clips.map((c) => {
                const p = c.kind === "clip" ? parseClip(c.value) : null;
                return p ? <ClipCard key={c.value} clip={p} /> : null;
              })}
            </div>
          </section>
        )}
        <div className="flex gap-5">
          <Link
            href="/onboarding/basics"
            className="text-[15px] font-semibold underline underline-offset-2"
          >
            Edit profile
          </Link>
          <Link
            href="/settings"
            className="text-[15px] font-semibold underline underline-offset-2"
          >
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}

/** "Open to": tap to say what you're up for right now. Saves on tap and shows on your profile. */
function OpenToPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => Promise<{ error?: string }> }) {
  const [error, setError] = useState("");
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-semibold">Open to</h2>
        <p className="text-[13px] text-smoke">Shows on your profile, so the right people reach out.</p>
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
              className="h-9 px-3.5 rounded-full text-[14px] inline-flex items-center gap-1.5 border transition active:scale-[0.97]"
              style={on ? { borderColor: o.color, background: `color-mix(in srgb, ${o.color} 18%, transparent)`, color: o.color, fontWeight: 600 } : { borderColor: "rgb(245 241 236 / 0.16)" }}
            >
              {on && <span className="size-1.5 rounded-full" style={{ background: o.color }} aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-[#FF453A]">
          {error}
        </p>
      )}
    </section>
  );
}

/** The parts of a profile that onboarding skips, offered one at a time afterwards. */
function FinishProfile({
  hasInfluences,
  hasTrack,
  hasProjects,
  hasGoals,
}: {
  hasInfluences: boolean;
  hasTrack: boolean;
  hasProjects: boolean;
  hasGoals: boolean;
}) {
  const todo = [
    !hasTrack && {
      href: "/onboarding/sound",
      title: "Add a track",
      sub: "Profiles with music get far more replies.",
    },
    !hasProjects && {
      href: "/me/projects",
      title: "Add your projects",
      sub: "The bands you've played in, old and new, with their music.",
    },
    !hasGoals && {
      href: "/onboarding/why",
      title: "Say what you're here for",
      sub: "Finding bandmates, gigs, or showing off your music.",
    },
    !hasInfluences && {
      href: "/onboarding/influences?from=profile",
      title: "Add your influences",
      sub: "So we can introduce musicians who share them.",
    },
  ].filter((x): x is { href: string; title: string; sub: string } =>
    Boolean(x),
  );
  if (!todo.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[17px] font-semibold">Finish your profile</h2>
      {todo.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="flex items-center gap-3 p-4 rounded-[18px] bg-stage border border-paper/8 transition hover:border-paper/40"
        >
          <span
            className="size-2 rounded-full bg-tungsten shrink-0"
            aria-hidden="true"
          />
          <span className="flex-1 flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{t.title}</span>
            <span className="text-[13px] text-smoke">{t.sub}</span>
          </span>
          <ChevronRight />
        </Link>
      ))}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-stage flex flex-col gap-1">
      <dt className="text-[12px] text-smoke">{label}</dt>
      <dd className="text-[15px] font-medium">{value || "—"}</dd>
    </div>
  );
}

/** Tap your photo to change it. It uploads and saves straight away. */
function PhotoPicker({ url, onSaved }: { url?: string; onSaved: (url: string) => void }) {
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
    <span className="relative shrink-0 md:w-full flex flex-col gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={url ? "Change your photo" : "Add a photo"}
        className="group relative block size-20 md:size-auto md:w-full md:aspect-[9/10] rounded-full md:rounded-[28px] bg-riser overflow-hidden"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" referrerPolicy="no-referrer" className={`size-full object-cover transition ${busy ? "opacity-40" : ""}`} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-smoke">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </span>
        )}
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:bottom-3 md:right-3 rounded-full bg-ink/80 backdrop-blur px-2 py-1 md:px-3 md:py-1.5 text-[11px] md:text-[13px] font-semibold opacity-90 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition">
          {busy ? "Saving…" : url ? "Change" : "Add"}
        </span>
      </button>
      {error && <span role="alert" className="text-[12px] text-smoke md:text-[13px]">{error}</span>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </span>
  );
}
