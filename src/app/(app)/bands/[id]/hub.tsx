"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FadeImg } from "@/components/fade-image";
import { Sheet, useSheetClose } from "@/components/sheet";
import { toast } from "@/components/toast";
import { BackButton, Button, cx } from "@/components/ui";
import { STATUS_LABEL, pageChecklist, showDate, type BandStatus } from "@/lib/band-shared";
import type { BandHub } from "@/lib/band-hub";
import { ROLE_IDS } from "@/lib/instruments";
import { shrinkPhoto } from "@/lib/photo";
import { BAND_GLOW, nameWash } from "@/lib/projects";
import { createClient, sessionUser } from "@/lib/supabase/client";
import { findBandmates, inviteBandmate, type Candidate } from "../../me/projects/band-actions";
import { addShow, answerBill, closeSpot, findBands, postSpot, removeShow, saveBandDetails } from "../actions";

type Panel = "edit" | "show" | "spot" | "invite" | null;

const SHEET =
  "md:max-w-[480px] max-h-[92dvh] overflow-y-auto rounded-t-hero md:rounded-hero bg-stage border border-paper/10 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col gap-4";

/** Your band: the chat, invites, open spots, shows and the page's details, in one list. */
export function BandHubView({ hub }: { hub: BandHub }) {
  const { band } = hub;
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
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

  return (
    <main className="relative pt-safe md:pt-4 px-5 md:px-0 pb-32 md:pb-16 md:max-w-[640px] md:mx-auto flex flex-col gap-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-4 h-[320px] -z-10 md:hidden" style={{ background: BAND_GLOW }} />
      <div className="mt-2 flex items-center justify-between">
        <BackButton href="/me" />
        <Link href={`/b/${band.id}`} className="glass h-10 px-4 rounded-full text-subhead font-semibold flex items-center">
          View page
        </Link>
      </div>

      <div className="flex items-center gap-4 pt-3">
        <span className="relative size-[72px] rounded-card-lg overflow-hidden shrink-0" style={{ background: nameWash(band.name) }}>
          {band.photo && <FadeImg src={band.photo} alt="" className="absolute inset-0 size-full object-cover" />}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-caption font-semibold tracking-[0.16em] uppercase text-smoke">Your band</span>
          <h1 className="headline text-display leading-none truncate">{band.name}</h1>
        </div>
      </div>

      {done < list.length && (
        <button type="button" onClick={() => setPanel(band.photo && band.bio && band.genres.length ? "show" : "edit")} className="text-left rounded-card-lg bg-stage p-4 flex flex-col gap-2.5">
          <span className="flex justify-between items-center">
            <span className="text-body font-semibold">
              Your page is {done} of {list.length} done
            </span>
            <span className="text-subhead font-semibold text-tungsten">Finish</span>
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
          <div key={b.showId} className="rounded-card-lg p-4 border border-tungsten/35 bg-[linear-gradient(160deg,rgb(255_178_69/0.12),var(--color-stage)_60%)] flex flex-col gap-2">
            <span className="text-caption font-semibold tracking-[0.16em] uppercase text-tungsten">Shared bill</span>
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

      <ul className="rounded-card-lg bg-stage divide-y divide-paper/8 overflow-hidden">
        <Row
          href={`/messages/b/${band.id}`}
          hue="#FFB245"
          solid
          icon={<path d="M4 5.5h16a1 1 0 011 1v10a1 1 0 01-1 1h-9l-4.5 3.5v-3.5H4a1 1 0 01-1-1v-10a1 1 0 011-1z" />}
          title="Band chat"
          sub={hub.chat?.preview ?? "Everyone who plays in it now"}
          badge={hub.chat?.unread}
        />
        <Row onClick={() => setPanel("invite")} hue="#FFACBA" icon={<path d="M12 5v14M5 12h14" />} title="Invite a bandmate" sub="They confirm their spot, then they're in" />
        <Row onClick={() => setPanel("spot")} hue="#C9B6FF" icon={<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>} title="Post an open spot" sub="Shows on your page, the Board and Search" />
        <Row onClick={() => setPanel("show")} hue="#F7BF77" icon={<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>} title="Add a show" sub="Date, venue, ticket link" />
        <Row onClick={() => setPanel("edit")} hue="#A8A49E" icon={<path d="M4 20h4L19 9l-4-4L4 16z" />} title="Edit band details" sub="Photo, bio, city, genres, status" />
      </ul>

      {band.spots.length > 0 && (
        <section className="flex flex-col gap-2 pt-2">
          <h2 className="text-title4 font-bold tracking-[-0.02em]">Open spots</h2>
          <ul className="rounded-card-lg bg-stage divide-y divide-paper/8">
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
          </ul>
        </section>
      )}

      {band.shows.length > 0 && (
        <section className="flex flex-col gap-2 pt-2">
          <h2 className="text-title4 font-bold tracking-[-0.02em]">Next shows</h2>
          <ul className="rounded-card-lg bg-stage divide-y divide-paper/8">
            {band.shows.map((s) => {
              const d = showDate(s.date);
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-10 flex flex-col items-center shrink-0">
                    <span className="text-caption2 font-bold uppercase tracking-[0.08em] text-tungsten">{d.month}</span>
                    <span className="text-title3 font-bold leading-none mt-0.5">{d.day}</span>
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-callout font-semibold truncate">{s.venue}</span>
                    <span className="text-footnote text-smoke truncate">{[d.weekday + (s.time ? ` ${s.time}` : ""), s.city].filter(Boolean).join(" · ")}</span>
                  </span>
                  <button type="button" onClick={() => run(() => removeShow(band.id, s.id), "Show removed")} aria-label={`Remove ${s.venue}`} className="size-8 rounded-full flex items-center justify-center text-smoke hover:text-paper hover:bg-paper/8">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-footnote text-smoke leading-[1.5] pt-1">Everyone who plays in {band.name} now can edit it. There&apos;s no owner and no admin. Past members stay on the page.</p>

      {panel && (
        <Sheet onClose={() => setPanel(null)} label={panel} scrimClassName="bg-ink/70 backdrop-blur-sm" className={SHEET}>
          {panel === "edit" && <EditForm hub={hub} onDone={() => router.refresh()} />}
          {panel === "show" && <ShowForm hub={hub} onDone={() => router.refresh()} />}
          {panel === "spot" && <SpotForm hub={hub} onDone={() => router.refresh()} />}
          {panel === "invite" && <InviteForm hub={hub} />}
        </Sheet>
      )}
    </main>
  );
}

function Row({ href, onClick, hue, solid, icon, title, sub, badge }: { href?: string; onClick?: () => void; hue: string; solid?: boolean; icon: React.ReactNode; title: string; sub: string; badge?: number }) {
  const body = (
    <>
      <span className="size-[34px] rounded-xs flex items-center justify-center shrink-0" style={solid ? { background: hue, color: "#0F0D0B" } : { background: `color-mix(in srgb, ${hue} 18%, transparent)`, color: hue }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-body font-semibold">{title}</span>
        <span className="text-footnote text-smoke truncate">{sub}</span>
      </span>
      {badge ? <span className="min-w-6 h-6 px-2 rounded-full bg-tungsten text-ink text-caption font-bold flex items-center justify-center">{badge}</span> : <span aria-hidden="true" className="text-smoke">›</span>}
    </>
  );
  const cls = "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-paper/4";
  return <li>{href ? <Link href={href} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>}</li>;
}

const input = "h-[50px] w-full rounded-2xl bg-ink/60 border border-paper/12 px-4 text-body text-paper placeholder:text-smoke/60 outline-none focus:border-paper/50";
const labelCls = "text-footnote font-semibold text-smoke";

function Heading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-title1 font-bold tracking-[-0.02em]">{children}</h2>
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
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={cx("h-9 px-3.5 rounded-full text-subhead border transition", status === s ? "bg-tungsten text-ink border-tungsten font-semibold" : "border-paper/16")}>
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
              <button key={t.id} type="button" onClick={() => setTagged(tagged.filter((x) => x.id !== t.id))} className="h-8 px-3 rounded-full bg-tungsten/16 text-tungsten text-footnote font-semibold">
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
            <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={cx("h-9 px-3.5 rounded-full text-subhead border transition", role === r ? "bg-tungsten text-ink border-tungsten font-semibold" : "border-paper/16")}>
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
      <label className="flex items-center justify-between gap-3">
        <span className="text-callout font-semibold">It&apos;s paid</span>
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-5 accent-tungsten" />
      </label>
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
