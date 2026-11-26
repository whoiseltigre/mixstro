"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FadeImg } from "@/components/fade-image";
import { Sheet, useSheetClose } from "@/components/sheet";
import { toast } from "@/components/toast";
import { BackButton, Button, Toggle, cx } from "@/components/ui";
import { STATUS_LABEL, pageChecklist, showDate, type BandStatus } from "@/lib/band-shared";
import type { BandHub, Rehearsal, Setlist } from "@/lib/band-hub";
import { ROLE_IDS, nounFor } from "@/lib/instruments";
import { shrinkPhoto } from "@/lib/photo";
import { nameWash } from "@/lib/projects";
import { createClient, sessionUser } from "@/lib/supabase/client";
import { findBandmates, inviteBandmate, type Candidate } from "../../me/projects/band-actions";
import { addShow, answerBill, answerRehearsal, closeSpot, findBands, planRehearsal, postFillIn, postSpot, removeRehearsal, removeSetlist, removeShow, saveBandDetails, saveSetlist } from "../actions";

type Panel = "add" | "edit" | "show" | "spot" | "invite" | "rehearsal" | "setlist" | "fillin" | null;

const SHEET =
  "md:max-w-[480px] max-h-[92dvh] overflow-y-auto rounded-t-hero md:rounded-hero bg-stage border border-paper/10 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-4";

/** Your band: the photo up top, four shortcuts, what's next, then each list with its own + button. */
export function BandHubView({ hub }: { hub: BandHub }) {
  const { band } = hub;
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState<Setlist | null>(null);
  const [, start] = useTransition();
  const list = pageChecklist(band);
  const done = list.filter((x) => x.done).length;
  const todo = list.filter((x) => !x.done).map((x) => x.todo);

  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (res.error) {
        toast(res.error);
        return;
      }
      toast(ok);
      router.refresh();
    });

  const now = band.members.filter((m) => m.endYear === undefined);
  const facts = [STATUS_LABEL[band.status], band.city, now.length ? `${now.length} ${now.length === 1 ? "member" : "members"}` : null].filter(Boolean).join(" · ");
  const openSetlist = (l: Setlist | null) => {
    setEditing(l);
    setPanel("setlist");
  };

  return (
    <main className="relative pb-32 md:pb-16 md:max-w-[640px] md:mx-auto flex flex-col">
      <header className="relative h-[300px] md:h-[260px] md:mt-4 md:rounded-hero overflow-hidden" style={{ background: nameWash(band.name) }}>
        {band.photo && <FadeImg src={band.photo} alt="" className="absolute inset-0 size-full object-cover" />}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_13_11/0.35)_0%,transparent_30%,rgb(15_13_11/0.55)_62%,var(--color-ink)_100%)]" />
        <div className="absolute inset-x-0 top-0 pt-safe md:pt-4 px-5 flex items-center justify-between">
          <BackButton href="/me" />
          <Link href={`/b/${band.id}`} className="glass h-10 px-4 rounded-full text-subhead font-semibold flex items-center">
            View page
          </Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-1 flex flex-col gap-1.5">
          <span className="eyebrow text-paper/70">Your band</span>
          <h1 className="headline text-display-md truncate">{band.name}</h1>
          <span className="text-subhead text-paper/70 truncate">{facts}</span>
        </div>
      </header>

      <div className="px-5 md:px-0 pt-4 flex flex-col gap-4">
        <nav aria-label="Band actions" className="grid grid-cols-4 gap-2">
          <Action href={`/messages/b/${band.id}`} hue="#FFB245" solid badge={hub.chat?.unread} label="Chat" icon={<path d="M4 5.5h16a1 1 0 011 1v10a1 1 0 01-1 1h-9l-4.5 3.5v-3.5H4a1 1 0 01-1-1v-10a1 1 0 011-1z" />} />
          {hub.rehearsals ? (
            <Action onClick={() => setPanel("rehearsal")} hue="#67E2DA" label="Rehearse" icon={<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>} />
          ) : (
            <Action onClick={() => setPanel("show")} hue="#F7BF77" label="Add a show" icon={<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>} />
          )}
          <Action onClick={() => setPanel("invite")} hue="#FFACBA" label="Invite" icon={<><circle cx="10" cy="8" r="3.5" /><path d="M3.5 19c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5M18 8v6M15 11h6" /></>} />
          <Action onClick={() => setPanel("add")} hue="#C9B6FF" label="More" icon={<path d="M12 5v14M5 12h14" />} />
        </nav>

        {done < list.length && (
          <button type="button" onClick={() => setPanel(band.photo && band.bio && band.genres.length ? "show" : "edit")} className="text-left rounded-card-lg bg-stage p-4 flex flex-col gap-2.5">
            <span className="flex justify-between items-center">
              <span className="text-body font-semibold">
                Your page is {done} of {list.length} done
              </span>
              <span className="text-subhead font-semibold text-paper">Finish</span>
            </span>
            <span className="h-1.5 rounded-full bg-riser overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${(done / list.length) * 100}%`, background: "var(--gel-linear)" }} />
            </span>
            <span className="text-footnote text-smoke">Add {todo.length > 1 ? `${todo.slice(0, -1).join(", ")} and ${todo[todo.length - 1]}` : todo[0]}</span>
          </button>
        )}

        {hub.bills.map((b) => {
          const d = showDate(b.date);
          return (
            <div key={b.showId} className="rounded-card-lg p-4 border border-gel-violet/35 bg-[linear-gradient(160deg,rgb(201_182_255/0.12),var(--color-stage)_60%)] flex flex-col gap-2">
              <span className="eyebrow text-gel-violet">Shared bill</span>
              <span className="text-callout font-semibold">
                {b.fromName} says you played {b.venue} together on {d.month} {d.day}
              </span>
              <span className="text-footnote text-smoke -mt-1">Confirm and both bands show it under &ldquo;Shared the stage with&rdquo;.</span>
              <span className="flex gap-2 pt-1">
                <button type="button" onClick={() => run(() => answerBill(band.id, b.showId, true), `Confirmed. ${b.fromName} is on your page.`)} className="h-9 px-4 rounded-full bg-paper text-ink text-subhead font-semibold">
                  We played it
                </button>
                <button type="button" onClick={() => run(() => answerBill(band.id, b.showId, false), "Taken off")} className="h-9 px-4 rounded-full border border-paper/20 text-subhead font-semibold">
                  Not us
                </button>
              </span>
            </div>
          );
        })}

        {hub.rehearsals?.[0] && <NextRehearsal r={hub.rehearsals[0]} onAnswer={(a) => run(() => answerRehearsal(band.id, hub.rehearsals![0].id, a), a === "in" ? "You're in" : "Got it. The band will see you can't make it.")} />}

        {hub.chat?.preview && (
          <Link href={`/messages/b/${band.id}`} className="press-card rounded-card-lg bg-stage px-4 py-3.5 flex items-center gap-3">
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-footnote text-smoke">Latest in the band chat</span>
              <span className="text-callout truncate">{hub.chat.preview}</span>
            </span>
            {hub.chat.unread ? <span className="min-w-6 h-6 px-2 rounded-full bg-paper text-ink text-caption font-semibold flex items-center justify-center">{hub.chat.unread}</span> : <span aria-hidden="true" className="text-smoke">›</span>}
          </Link>
        )}

        {hub.rehearsals && hub.rehearsals.length > 1 && (
          <Section title="Coming up" onAdd={() => setPanel("rehearsal")} addLabel="Plan a rehearsal">
            {hub.rehearsals.slice(1).map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-callout font-semibold truncate">{when(r.startsAt)}</span>
                  <span className="text-footnote text-smoke truncate">
                    {r.mine === "in" ? "You're in" : r.mine === "out" ? "You can't make it" : `${r.inNames.length} in · you haven't said`} · {r.place}
                  </span>
                </span>
                {r.mine === "in" ? (
                  <button type="button" onClick={() => run(() => answerRehearsal(band.id, r.id, "out"), "Got it")} className="h-8 px-3 rounded-full border border-paper/20 text-footnote font-semibold shrink-0">
                    Can&apos;t
                  </button>
                ) : (
                  <button type="button" onClick={() => run(() => answerRehearsal(band.id, r.id, "in"), "You're in")} className="h-8 px-3 rounded-full bg-paper text-ink text-footnote font-semibold shrink-0">
                    I&apos;m in
                  </button>
                )}
                <RemoveButton label={`Remove rehearsal ${when(r.startsAt)}`} onClick={() => run(() => removeRehearsal(band.id, r.id), "Rehearsal removed")} />
              </li>
            ))}
          </Section>
        )}

        <Section title="Next shows" onAdd={() => setPanel("show")} addLabel="Add a show" empty="No shows yet. Add one and it goes on your page.">
          {band.shows.map((s) => {
            const d = showDate(s.date);
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-10 flex flex-col items-center shrink-0">
                  <span className="text-caption2 font-semibold uppercase tracking-[0.08em] text-gel-violet">{d.month}</span>
                  <span className="text-title3 font-semibold leading-none mt-0.5">{d.day}</span>
                </span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="text-callout font-semibold truncate">{s.venue}</span>
                  <span className="text-footnote text-smoke truncate">{[d.weekday + (s.time ? ` ${s.time}` : ""), s.city].filter(Boolean).join(" · ")}</span>
                </span>
                <RemoveButton label={`Remove ${s.venue}`} onClick={() => run(() => removeShow(band.id, s.id), "Show removed")} />
              </li>
            );
          })}
        </Section>

        <Section title="Open spots" onAdd={() => setPanel("spot")} addLabel="Post an open spot" empty="Need someone? Post a spot and it shows on the Board and in Search.">
          {band.spots.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={hub.demo ? "/board" : `/board/${s.id}`} className="flex-1 min-w-0 flex flex-col">
                <span className="text-callout font-semibold truncate">{s.role ?? s.title}</span>
                <span className="text-footnote text-smoke">{s.asked ? `${s.asked} ${s.asked === 1 ? "musician" : "musicians"} asked · see them` : "No one yet"}</span>
              </Link>
              <button type="button" onClick={() => run(() => closeSpot(band.id, s.id), "Spot closed")} className="h-8 px-3 rounded-full border border-paper/20 text-footnote font-semibold shrink-0">
                Filled
              </button>
            </li>
          ))}
        </Section>

        {hub.setlists && (
          <Section title="Setlists" onAdd={() => openSetlist(null)} addLabel="New setlist" empty="Keep the band's setlists here. Everyone can edit them.">
            {hub.setlists.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => openSetlist(l)} className="w-full text-left px-4 py-3 flex flex-col gap-0.5 hover:bg-paper/5">
                  <span className="text-callout font-semibold truncate">{l.name}</span>
                  <span className="text-footnote text-smoke truncate">
                    {l.songs.length} {l.songs.length === 1 ? "song" : "songs"}
                    {l.songs.length ? ` · ${l.songs.slice(0, 3).join(", ")}${l.songs.length > 3 ? "…" : ""}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </Section>
        )}

        <p className="text-footnote text-smoke leading-[1.5] pt-1">Everyone who plays in {band.name} now can edit it. There&apos;s no owner and no admin. Past members stay on the page.</p>
      </div>

      {panel && (
        <Sheet onClose={() => setPanel(null)} label={panel} scrimClassName="bg-ink/70 backdrop-blur-sm" className={SHEET}>
          {panel === "add" && <AddMenu hub={hub} pick={(p) => (p === "setlist" ? openSetlist(null) : setPanel(p))} />}
          {panel === "edit" && <EditForm hub={hub} onDone={() => router.refresh()} />}
          {panel === "show" && <ShowForm hub={hub} onDone={() => router.refresh()} />}
          {panel === "spot" && <SpotForm hub={hub} onDone={() => router.refresh()} />}
          {panel === "invite" && <InviteForm hub={hub} />}
          {panel === "rehearsal" && <RehearsalForm hub={hub} onDone={() => router.refresh()} />}
          {panel === "setlist" && <SetlistForm hub={hub} setlist={editing} onDone={() => router.refresh()} />}
          {panel === "fillin" && <FillInForm hub={hub} onDone={() => router.refresh()} />}
        </Sheet>
      )}
    </main>
  );
}

/** One of the four round shortcuts under the band photo. */
function Action({ href, onClick, hue, solid, icon, label, badge }: { href?: string; onClick?: () => void; hue: string; solid?: boolean; icon: React.ReactNode; label: string; badge?: number }) {
  const body = (
    <>
      <span className="relative size-14 rounded-full flex items-center justify-center" style={solid ? { background: hue, color: "var(--color-ink)" } : { background: `color-mix(in srgb, ${hue} 16%, var(--color-stage))`, color: hue }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
        {badge ? <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1.5 rounded-full bg-paper text-ink text-caption2 font-semibold flex items-center justify-center">{badge}</span> : null}
      </span>
      <span className="text-footnote text-paper/80">{label}</span>
    </>
  );
  const cls = "press flex flex-col items-center gap-1.5";
  return href ? (
    <Link href={href} className={cls} data-haptic>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} data-haptic>
      {body}
    </button>
  );
}

/** A titled list with its own + button, so each kind of thing is added where it lives. */
function Section({ title, onAdd, addLabel, empty, children }: { title: string; onAdd: () => void; addLabel: string; empty?: string; children: React.ReactNode[] }) {
  const has = children.length > 0;
  if (!has && !empty) return null;
  return (
    <section className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-title4 font-semibold tracking-[-0.01em]">{title}</h2>
        <button type="button" onClick={onAdd} aria-label={addLabel} className="hit-slop size-8 rounded-full bg-paper/8 text-paper flex items-center justify-center hover:bg-paper/14">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {has ? (
        <ul className="rounded-card-lg bg-stage divide-y divide-paper/8 overflow-hidden">{children}</ul>
      ) : (
        <button type="button" onClick={onAdd} className="rounded-card-lg border border-dashed border-paper/14 px-4 py-3.5 text-left text-footnote text-smoke hover:bg-paper/4">
          {empty}
        </button>
      )}
    </section>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="size-8 rounded-full flex items-center justify-center text-smoke hover:text-paper hover:bg-paper/8">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

/** "More": everything else you can add, as one sheet instead of a wall of rows on the page. */
function AddMenu({ hub, pick }: { hub: BandHub; pick: (p: Exclude<Panel, "add" | null>) => void }) {
  const items: { p: Exclude<Panel, "add" | null>; hue: string; title: string; sub: string; icon: React.ReactNode }[] = [
    { p: "fillin", hue: "#FFB245", title: "Need a fill-in", sub: "A sub for one date. Players nearby get an alert", icon: <path d="M12 4v16M4 12h16" /> },
    { p: "spot", hue: "#C9B6FF", title: "Post an open spot", sub: "Shows on your page, the Board and Search", icon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></> },
    { p: "show", hue: "#F7BF77", title: "Add a show", sub: "Date, venue, ticket link", icon: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></> },
    ...(hub.setlists ? [{ p: "setlist" as const, hue: "#B5C5FF", title: "New setlist", sub: "One song per line, shared with the band", icon: <path d="M5 6h14M5 12h14M5 18h9" /> }] : []),
    { p: "edit", hue: "#A8A49E", title: "Edit band details", sub: "Photo, bio, city, genres, status", icon: <path d="M4 20h4L19 9l-4-4L4 16z" /> },
  ];
  return (
    <div className="flex flex-col gap-3">
      <Heading>Add to {hub.band.name}</Heading>
      <ul className="flex flex-col">
        {items.map((it) => (
          <li key={it.p}>
            <button type="button" onClick={() => pick(it.p)} className="w-full flex items-center gap-3.5 py-3 text-left">
              <span className="size-[38px] rounded-field flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${it.hue} 18%, transparent)`, color: it.hue }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {it.icon}
                </svg>
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-body font-semibold">{it.title}</span>
                <span className="text-footnote text-smoke truncate">{it.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const input = "field field-inset h-[52px] w-full px-4 text-body";
const labelCls = "text-footnote font-semibold text-smoke";

function Heading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="headline text-title1">{children}</h2>
      {sub && <p className="text-subhead text-smoke">{sub}</p>}
    </div>
  );
}

function ErrorLine({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="text-footnote text-danger">
      {text}
    </p>
  ) : null;
}

const STATUSES: BandStatus[] = ["active", "recording", "break", "done"];

function EditForm({ hub, onDone }: { hub: BandHub; onDone: () => void }) {
  const { band } = hub;
  const close = useSheetClose();
  const [bio, setBio] = useState(band.bio ?? "");
  const [city, setCity] = useState(band.city ?? "");
  const [genres, setGenres] = useState(band.genres.join(", "));
  const [status, setStatus] = useState<BandStatus>(band.status);
  const [photo, setPhoto] = useState<string | null>(band.photo ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  async function pick(file: File) {
    setError(undefined);
    const supabase = createClient();
    if (!supabase || hub.demo) return setError("Sign in to add your band's photo.");
    setUploading(true);
    try {
      const user = await sessionUser(supabase);
      if (!user) throw new Error();
      const blob = await (await fetch(await shrinkPhoto(file))).blob();
      const path = `${user.id}/bands/${band.id}-${Date.now()}.jpg`;
      const { error: up } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (up) throw up;
      setPhoto(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    } catch {
      setError("That photo didn't upload. Try another.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveBandDetails(band.id, { bio, city, genres: genres.split(","), status, photoUrl: photo });
          if (res.error) return setError(res.error);
          toast("Saved");
          onDone();
          close();
        });
      }}
    >
      <Heading>Edit {band.name}</Heading>
      <label className="relative h-[150px] rounded-card-lg overflow-hidden cursor-pointer flex items-center justify-center" style={{ background: nameWash(band.name) }}>
        {photo && <FadeImg src={photo} alt="" className="absolute inset-0 size-full object-cover" />}
        <span className="relative glass h-10 px-4 rounded-full text-subhead font-semibold flex items-center">{uploading ? "Uploading…" : photo ? "Change band photo" : "Add a band photo"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      </label>
      <div className="flex flex-col gap-2">
        <label htmlFor="band-bio" className={labelCls}>
          Bio
        </label>
        <textarea id="band-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} rows={4} placeholder="What you sound like, where you play, what's out." className={cx(input, "h-auto py-3 leading-[1.45] resize-none")} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="band-city" className={labelCls}>
          Based in
        </label>
        <input id="band-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} placeholder="Echo Park, LA" className={input} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="band-genres" className={labelCls}>
          Genres
        </label>
        <input id="band-genres" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Indie rock, post-punk" className={input} />
        <p className="text-caption text-smoke">Up to 5, separated by commas</p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className={cx(labelCls, "mb-2")}>Right now</legend>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={cx("h-9 px-3.5 rounded-full text-subhead border transition", status === s ? "bg-paper text-ink border-paper font-semibold" : "border-paper/16")}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </fieldset>
      <ErrorLine text={error} />
      <Button type="submit" disabled={pending || uploading} className="h-12">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function ShowForm({ hub, onDone }: { hub: BandHub; onDone: () => void }) {
  const close = useSheetClose();
  const [s, set] = useState({ date: "", time: "", venue: "", city: hub.band.city?.split(",")[0] ?? "", ticketUrl: "", withText: "" });
  const [tagged, setTagged] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const field = (k: keyof typeof s) => ({ value: s[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ ...s, [k]: e.target.value }) });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addShow(hub.band.id, { ...s, withBands: tagged.map((t) => t.id) });
          if (res.error) return setError(res.error);
          toast("Show added. The band chat got a heads up.");
          onDone();
          close();
        });
      }}
    >
      <Heading sub="It shows on your page until the day after.">Add a show</Heading>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="show-date" className={labelCls}>
            Date
          </label>
          <input id="show-date" type="date" required min={new Date().toISOString().slice(0, 10)} className={input} {...field("date")} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="show-time" className={labelCls}>
            Time
          </label>
          <input id="show-time" placeholder="9pm" maxLength={20} className={input} {...field("time")} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="show-venue" className={labelCls}>
          Venue
        </label>
        <input id="show-venue" required placeholder="The Echo" maxLength={80} className={input} {...field("venue")} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="show-city" className={labelCls}>
          City
        </label>
        <input id="show-city" placeholder="Echo Park" maxLength={80} className={input} {...field("city")} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="show-ticket" className={labelCls}>
          Ticket link
        </label>
        <input id="show-ticket" inputMode="url" placeholder="Optional" maxLength={500} className={input} {...field("ticketUrl")} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="show-with" className={labelCls}>
          Who else is on the bill
        </label>
        <input
          id="show-with"
          value={q}
          placeholder="Search bands on Mixstro"
          className={input}
          onChange={async (e) => {
            setQ(e.target.value);
            setFound(e.target.value.trim().length >= 2 ? (await findBands(e.target.value)).filter((b) => b.id !== hub.band.id && !tagged.some((t) => t.id === b.id)) : []);
          }}
        />
        {found.length > 0 && (
          <ul className="rounded-2xl bg-ink/60 border border-paper/10 divide-y divide-paper/8">
            {found.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTagged([...tagged, b]);
                    setFound([]);
                    setQ("");
                  }}
                  className="w-full text-left px-4 py-2.5 text-callout hover:bg-paper/5"
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {tagged.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tagged.map((t) => (
              <button key={t.id} type="button" onClick={() => setTagged(tagged.filter((x) => x.id !== t.id))} className="h-8 px-3 rounded-full bg-gel-violet/16 text-gel-violet text-footnote font-semibold">
                {t.name} ✕
              </button>
            ))}
          </div>
        )}
        <input aria-label="Other acts not on Mixstro" placeholder="Other acts not on Mixstro (optional)" maxLength={120} className={input} {...field("withText")} />
        <p className="text-caption text-smoke">Bands you tag confirm it, then you both show &ldquo;Shared the stage with&rdquo;.</p>
      </div>
      <ErrorLine text={error} />
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Adding…" : "Add show"}
      </Button>
    </form>
  );
}

function SpotForm({ hub, onDone }: { hub: BandHub; onDone: () => void }) {
  const close = useSheetClose();
  const [role, setRole] = useState("");
  const [details, setDetails] = useState("");
  const [paid, setPaid] = useState(false);
  const [pay, setPay] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await postSpot(hub.band.id, { role, details, paid, pay });
          if (res.error) return setError(res.error);
          toast("Posted. Musicians who play it will see it.");
          onDone();
          close();
        });
      }}
    >
      <Heading sub="Answers land in your band chat, with each musician's profile and music.">Post an open spot</Heading>
      <fieldset className="flex flex-col gap-2">
        <legend className={cx(labelCls, "mb-2")}>Who you need</legend>
        <div className="flex flex-wrap gap-2">
          {ROLE_IDS.map((r) => (
            <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={cx("h-9 px-3.5 rounded-full text-subhead border transition", role === r ? "bg-paper text-ink border-paper font-semibold" : "border-paper/16")}>
              {r}
            </button>
          ))}
        </div>
        <input aria-label="Or type the role" placeholder="Or type it: Lead guitar, cello…" maxLength={60} value={ROLE_IDS.includes(role) ? "" : role} onChange={(e) => setRole(e.target.value)} className={input} />
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="spot-details" className={labelCls}>
          Details
        </label>
        <textarea id="spot-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} placeholder="How often you rehearse, where, what you sound like." className={cx(input, "h-auto py-3 leading-[1.45] resize-none")} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-callout font-semibold">It&apos;s paid</span>
        <Toggle on={paid} onChange={setPaid} label="It's paid" />
      </div>
      {paid && <input aria-label="Pay" placeholder="$150 a show" maxLength={40} value={pay} onChange={(e) => setPay(e.target.value)} className={input} />}
      <ErrorLine text={error} />
      <Button type="submit" disabled={pending || !role.trim()} className="h-12">
        {pending ? "Posting…" : "Post the spot"}
      </Button>
    </form>
  );
}

function InviteForm({ hub }: { hub: BandHub }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Candidate[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const project = hub.projectId;

  function invite(toId?: string, name?: string) {
    if (!project) return setError("Sign in to invite your bandmates.");
    setError(undefined);
    start(async () => {
      const res = await inviteBandmate(project, toId);
      if (res.error || !res.link) return setError(res.error ?? "That didn't work. Try again.");
      if (toId) {
        toast(`Invited ${name}. They'll confirm their spot.`);
        return;
      }
      const data = { title: `Join ${hub.band.name} on Mixstro`, text: `Confirm your spot in ${hub.band.name} on Mixstro`, url: res.link };
      try {
        if (navigator.share) return await navigator.share(data);
      } catch {
        return;
      }
      await navigator.clipboard?.writeText(res.link).catch(() => {});
      toast("Invite link copied");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Heading sub="Once they confirm, they're on the page and in the band chat.">Invite a bandmate</Heading>
      <Button type="button" onClick={() => invite()} disabled={pending} className="h-12">
        Send an invite link
      </Button>
      <div className="flex flex-col gap-2">
        <label htmlFor="mate-q" className={labelCls}>
          Or find them on Mixstro
        </label>
        <input
          id="mate-q"
          value={q}
          placeholder="Name or username"
          className={input}
          onChange={async (e) => {
            setQ(e.target.value);
            setFound(e.target.value.trim().length >= 2 ? await findBandmates(e.target.value) : []);
          }}
        />
        <ul className="flex flex-col">
          {found.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="relative size-10 rounded-full overflow-hidden bg-riser shrink-0">{c.photo && <FadeImg src={c.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />}</span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-callout font-semibold">{c.name}</span>
                <span className="text-footnote text-smoke">{c.instrument}</span>
              </span>
              <button type="button" onClick={() => invite(c.id, c.name)} disabled={pending} className="h-9 px-4 rounded-full bg-paper text-ink text-subhead font-semibold">
                Invite
              </button>
            </li>
          ))}
        </ul>
      </div>
      <ErrorLine text={error} />
    </div>
  );
}

/** "Thu, Dec 3 · 7:00 PM", in the phone's own time zone. */
function when(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/** The next rehearsal, big: when, where, who's in, and your answer in one tap. */
function NextRehearsal({ r, onAnswer }: { r: Rehearsal; onAnswer: (a: "in" | "out") => void }) {
  const names = r.inNames.length ? (r.inNames.length > 3 ? `${r.inNames.slice(0, 3).join(", ")} and ${r.inNames.length - 3} more` : r.inNames.join(", ")) : "No one yet";
  return (
    <section aria-label="Next rehearsal" className="rounded-card-lg p-4 border border-gel-teal/35 bg-[linear-gradient(160deg,rgb(103_226_218/0.12),var(--color-stage)_60%)] flex flex-col gap-2">
      <span className="eyebrow text-gel-teal">Next rehearsal</span>
      <span className="text-title3 font-semibold leading-tight">{when(r.startsAt)}</span>
      <span className="text-subhead text-smoke -mt-1">{r.place}</span>
      {r.note && <span className="text-footnote text-paper/80">{r.note}</span>}
      <span className="text-footnote text-smoke">
        In: {names}
        {r.outCount ? ` · ${r.outCount} can't make it` : ""}
      </span>
      <span className="flex gap-2 pt-1">
        <button type="button" aria-pressed={r.mine === "in"} onClick={() => onAnswer("in")} className={cx("h-9 px-4 rounded-full text-subhead font-semibold", r.mine === "in" ? "bg-gel-teal text-ink" : "bg-paper text-ink")}>
          {r.mine === "in" ? "You're in" : "I'm in"}
        </button>
        <button type="button" aria-pressed={r.mine === "out"} onClick={() => onAnswer("out")} className={cx("h-9 px-4 rounded-full text-subhead font-semibold border", r.mine === "out" ? "border-danger text-danger" : "border-paper/20")}>
          {r.mine === "out" ? "You can't make it" : "Can't make it"}
        </button>
      </span>
    </section>
  );
}

function RehearsalForm({ hub, onDone }: { hub: BandHub; onDone: () => void }) {
  const close = useSheetClose();
  const last = hub.rehearsals?.at(-1);
  const [s, set] = useState({ date: "", time: "19:00", place: last?.place ?? "", note: "" });
  const [weekly, setWeekly] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const field = (k: keyof typeof s) => ({ value: s[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ ...s, [k]: e.target.value }) });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!s.date || !s.time) return setError("Pick a day and time.");
        start(async () => {
          const res = await planRehearsal(hub.band.id, { startsAt: new Date(`${s.date}T${s.time}`).toISOString(), place: s.place, note: s.note, weeks: weekly ? 4 : 1 });
          if (res.error) return setError(res.error);
          toast(weekly ? "Planned for the next 4 weeks. The band chat got it." : "Planned. The band chat got it.");
          onDone();
          close();
        });
      }}
    >
      <Heading sub="Everyone in the band gets it in the chat and can say if they're in.">Plan a rehearsal</Heading>
      <div className="grid grid-cols-[1fr_130px] gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="reh-date" className={labelCls}>
            Day
          </label>
          <input id="reh-date" type="date" required min={new Date().toISOString().slice(0, 10)} className={input} {...field("date")} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="reh-time" className={labelCls}>
            Time
          </label>
          <input id="reh-time" type="time" required className={input} {...field("time")} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="reh-place" className={labelCls}>
          Where
        </label>
        <input id="reh-place" required placeholder="Lucky Lou's, Room B" maxLength={80} className={input} {...field("place")} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="reh-note" className={labelCls}>
          Note
        </label>
        <input id="reh-note" placeholder="Optional: what to work on" maxLength={200} className={input} {...field("note")} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-callout font-semibold">Every week</span>
          <span className="text-footnote text-smoke">Same day and time for the next 4 weeks</span>
        </span>
        <Toggle on={weekly} onChange={setWeekly} label="Every week" />
      </div>
      <ErrorLine text={error} />
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Planning…" : "Plan it"}
      </Button>
    </form>
  );
}

function SetlistForm({ hub, setlist, onDone }: { hub: BandHub; setlist: Setlist | null; onDone: () => void }) {
  const close = useSheetClose();
  const [name, setName] = useState(setlist?.name ?? (hub.band.shows[0] ? `${hub.band.shows[0].venue}` : ""));
  const [songs, setSongs] = useState(setlist?.songs.join("\n") ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const count = songs.split("\n").filter((l) => l.trim()).length;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveSetlist(hub.band.id, setlist?.id ?? null, name, songs);
          if (res.error) return setError(res.error);
          toast("Setlist saved for the whole band");
          onDone();
          close();
        });
      }}
    >
      <Heading sub="Anyone in the band can edit it. Paste a list or type one song per line.">{setlist ? "Edit setlist" : "New setlist"}</Heading>
      <div className="flex flex-col gap-2">
        <label htmlFor="set-name" className={labelCls}>
          Name
        </label>
        <input id="set-name" required placeholder="Friday at the Echo" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="set-songs" className={labelCls}>
          Songs{count ? ` (${count})` : ""}
        </label>
        <textarea id="set-songs" value={songs} onChange={(e) => setSongs(e.target.value)} rows={9} placeholder={"Opener\nThe new one\nCover we always play\nCloser"} className={cx(input, "h-auto py-3 leading-[1.5] resize-none")} />
      </div>
      <ErrorLine text={error} />
      <Button type="submit" disabled={pending || !name.trim()} className="h-12">
        {pending ? "Saving…" : "Save setlist"}
      </Button>
      {setlist && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await removeSetlist(hub.band.id, setlist.id);
              if (res.error) return setError(res.error);
              toast("Setlist removed");
              onDone();
              close();
            })
          }
          className="h-11 text-subhead font-semibold text-danger"
        >
          Remove this setlist
        </button>
      )}
    </form>
  );
}

function FillInForm({ hub, onDone }: { hub: BandHub; onDone: () => void }) {
  const close = useSheetClose();
  const router = useRouter();
  const [role, setRole] = useState("");
  const [date, setDate] = useState(hub.band.shows[0]?.date ?? "");
  const [details, setDetails] = useState("");
  const [paid, setPaid] = useState(true);
  const [pay, setPay] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await postFillIn(hub.band.id, { role, date, details, paid, pay });
          if (res.error) return setError(res.error);
          toast("Posted. Players nearby who play it get an alert.");
          onDone();
          close();
          if (res.postId) router.push(`/board/${res.postId}?posted=1`);
        });
      }}
    >
      <Heading sub="Someone out sick or away? Post it for one date. It closes the day after.">Need a fill-in</Heading>
      <fieldset className="flex flex-col gap-2">
        <legend className={cx(labelCls, "mb-2")}>Who you need</legend>
        <div className="flex flex-wrap gap-2">
          {ROLE_IDS.map((r) => (
            <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={cx("h-9 px-3.5 rounded-full text-subhead border transition", role === r ? "bg-paper text-ink border-paper font-semibold" : "border-paper/16")}>
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="fill-date" className={labelCls}>
          Date
        </label>
        <input id="fill-date" type="date" required min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="fill-details" className={labelCls}>
          Details
        </label>
        <textarea id="fill-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} placeholder="The gig, how many songs, whether there's a rehearsal first." className={cx(input, "h-auto py-3 leading-[1.45] resize-none")} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-callout font-semibold">It&apos;s paid</span>
        <Toggle on={paid} onChange={setPaid} label="It's paid" />
      </div>
      {paid && <input aria-label="Pay" placeholder="$100 for the night" maxLength={40} value={pay} onChange={(e) => setPay(e.target.value)} className={input} />}
      <ErrorLine text={error} />
      <Button type="submit" disabled={pending || !role || !date} className="h-12">
        {pending ? "Posting…" : role ? `Find a ${nounFor(role)}` : "Post it"}
      </Button>
    </form>
  );
}
