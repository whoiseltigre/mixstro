import Link from "next/link";
import { PersonPhoto } from "@/components/person-photo";
import { Wordmark } from "@/components/ui";
import { familyOf, nounFor } from "@/lib/instruments";
import { statusLine } from "@/lib/opening-reasons";
import type { PublicOpening } from "@/lib/public-opening";
import { OpeningClip, ReplyBox } from "./reply";

const DAY: Record<string, string> = { Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat", Sun: "Sun" };

export function headline(o: PublicOpening) {
  const who = o.band ?? o.author.first_name;
  const need = nounFor(o.needed_role);
  return `${who} ${o.band ? "need" : "needs"} a ${need}`;
}

/** "I play drums", "I sing", "I produce". */
function ctaFor(role: string) {
  if (role === "Vocals") return "I sing";
  if (role === "Producer") return "I produce";
  if (role === "Songwriter") return "I write songs";
  if (role === "DJ") return "I DJ";
  return `I play ${(familyOf(role)?.label ?? role).toLowerCase()}`;
}

/** The page itself, given the opening and where the visitor stands. */
export function OpeningView({ o, signedIn, own, answered }: { o: PublicOpening; signedIn: boolean; own: boolean; answered: boolean }) {
  const open = o.status === "open";
  const facts = [
    o.area || null,
    o.rehearsal_days.length ? `Rehearses ${o.rehearsal_days.map((d) => DAY[d] ?? d).join("/")}` : null,
    o.event_date ? new Date(`${o.event_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : null,
    o.offered_role ? `${o.author.first_name} plays ${o.offered_role.toLowerCase()}` : null,
  ].filter(Boolean);
  const person = { id: o.author.id, name: o.author.first_name, photo: o.author.avatar_url, photoAlt: `${o.author.first_name}'s photo` };

  return (
    <main className="min-h-dvh bg-ink text-paper px-5 pt-safe pb-16">
      <div className="mx-auto w-full max-w-[520px] flex flex-col gap-6">
        <Link href="/" className="mt-4 self-start" aria-label="Mixstro">
          <Wordmark size={22} />
        </Link>

        <section className="rounded-sheet bg-stage p-5 flex flex-col gap-3" style={{ background: "radial-gradient(120% 120% at 0% 0%, rgb(255 178 69 / 0.14), transparent 60%), var(--color-stage)" }}>
          <span className="self-start h-6 px-2.5 rounded-full bg-paper text-ink text-caption2 font-bold tracking-[0.08em] uppercase flex items-center">
            {open ? "Open spot" : statusLine(o.status, o.expires_at)}
          </span>
          <h1 className="headline text-title-lg leading-[1.1]">{headline(o)}</h1>
          <p className="text-callout text-smoke">{facts.join(" · ")}</p>
          {!open && (
            <p className="text-callout">
              {o.status === "filled" ? `This spot was filled. Thanks for looking.` : o.status === "paused" ? `${o.author.first_name} paused this for now.` : "This opening has closed."}
            </p>
          )}
        </section>

        {o.clip && <OpeningClip id={o.id} url={o.clip.url} label={`Hear ${o.band ?? o.author.first_name}`} />}

        {own ? (
          <p className="rounded-card bg-stage p-4 text-callout">
            This is your opening. <Link href={`/board/${o.id}`} className="underline underline-offset-2">See who answered and who fits</Link>.
          </p>
        ) : (
          <ReplyBox id={o.id} cta={ctaFor(o.needed_role)} first={o.author.first_name} signedIn={signedIn} open={open} answered={answered} />
        )}

        {o.details && (
          <section className="flex flex-col gap-2">
            <h2 className="text-footnote font-semibold text-smoke">{o.title}</h2>
            <p className="text-body leading-[1.5] whitespace-pre-line">{o.details}</p>
          </section>
        )}

        <Link href={`/@${o.author.username}`} className="flex items-center gap-3 p-3.5 rounded-card bg-stage hover:bg-riser transition">
          <span className="relative size-12 rounded-full overflow-hidden shrink-0">
            <PersonPhoto person={person} sizes="48px" initialsSize={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-body font-semibold">{o.author.first_name}</span>
            <span className="text-footnote text-smoke">{[o.author.instrument, "See their music"].filter(Boolean).join(" · ")}</span>
          </span>
        </Link>
      </div>
    </main>
  );
}
