import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, VerifiedMark, Wordmark } from "@/components/ui";
import { artistTint } from "@/lib/artists";
import { STATUS_LABEL, bandYears, getBandPage, showDate, spotAnswer, type BandMember, type BandPage, type BandSpot } from "@/lib/band-page";
import { PROVIDER_LABEL } from "@/lib/clips";
import { APP_ORIGIN } from "@/lib/public-profile";
import { JsonLd } from "@/components/json-ld";
import { BAND_GLOW, nameWash } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { FadeImg } from "@/components/fade-image";
import { BandActions } from "@/components/band-actions";
import { Toaster } from "@/components/toast";

/**
 * A band's page: its photo, bio, genres and status, everyone who confirmed they played in
 * it (each confirmation is a bandmate vouching for the others), open spots, upcoming shows,
 * its music, and the bands it shared a bill with. Opens signed out, so a band can share one link.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const band = await getBandPage(id);
  if (!band) return { title: "Mixstro" };
  const names = band.members.map((m) => m.name);
  const title = `${band.name} on Mixstro`;
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const description = band.bio
    ? `${band.bio.slice(0, 150)}${band.bio.length > 150 ? "…" : ""} ${who} on Mixstro.`
    : `${band.name} (${bandYears(band)}): ${who}. Listen and meet the band on Mixstro.`;
  const images = band.photo?.startsWith("https://") ? [{ url: band.photo }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `${APP_ORIGIN}/b/${band.id}` },
    openGraph: { type: "website", title, description, url: `${APP_ORIGIN}/b/${band.id}`, siteName: "Mixstro", images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description },
  };
}

export default async function BandPageView({ params }: Params) {
  const { id } = await params;
  const band = await getBandPage(id);
  if (!band) notFound();
  const supabase = await createClient();
  const signedIn = Boolean(supabase && (await supabase.auth.getClaims()).data?.claims?.sub);
  const now = band.members.filter((m) => m.endYear === undefined);
  const before = band.members.filter((m) => m.endYear !== undefined);
  const lineup = now.length ? now : band.members;
  const url = `${APP_ORIGIN}/b/${band.id}`;
  const place = band.city?.split(",")[0];
  const eyebrow = ["Band", place, band.endYear === undefined ? `Since ${band.startYear}` : bandYears(band)].filter(Boolean).join(" · ");

  return (
    <div className="isolate relative min-h-dvh w-full">
      {band.photo ? (
        <>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[480px] md:h-[560px] -z-10 overflow-hidden">
            <FadeImg src={band.photo} alt="" className="size-full object-cover object-[center_35%]" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[480px] md:h-[560px] -z-10 bg-[linear-gradient(180deg,rgb(15_13_11/0.45),rgb(15_13_11/0.1)_30%,rgb(15_13_11/0.85)_78%,var(--color-ink))]" />
        </>
      ) : (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10" style={{ background: BAND_GLOW }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 bg-gradient-to-b from-ink/30 to-ink" />
        </>
      )}
      <div className="w-full mx-auto max-w-[560px] md:max-w-[1000px] px-5 md:px-10 pb-32 md:pb-20">
        <header className="pt-safe mt-3 md:mt-6 flex items-center justify-between">
          <Link href={signedIn ? "/discover" : "/"} aria-label="Mixstro home">
            <Wordmark size={24} />
          </Link>
          {!signedIn && (
            <ButtonLink href="/" variant="glass" className="h-10 !w-auto px-4 text-subhead">
              Join Mixstro
            </ButtonLink>
          )}
        </header>

        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "MusicGroup",
            name: band.name,
            url,
            foundingDate: String(band.startYear),
            ...(band.bio && { description: band.bio }),
            ...(band.genres.length && { genre: band.genres }),
            ...(band.photo?.startsWith("https://") && { image: band.photo }),
            ...(band.city && { foundingLocation: { "@type": "Place", name: band.city } }),
            member: band.members.map((m) => ({
              "@type": "OrganizationRole",
              ...(m.role && { roleName: m.role }),
              startDate: String(m.startYear),
              ...(m.endYear !== undefined && { endDate: String(m.endYear) }),
              member: { "@type": "Person", name: m.name, url: `${APP_ORIGIN}/@${m.username}` },
            })),
            ...(band.shows.length && {
              event: band.shows.map((s) => ({
                "@type": "MusicEvent",
                name: `${band.name} at ${s.venue}`,
                startDate: s.date,
                location: { "@type": "Place", name: s.venue, ...(s.city && { address: s.city }) },
                ...(s.ticketUrl && { offers: { "@type": "Offer", url: s.ticketUrl } }),
              })),
            }),
          }}
        />
        <main className={`${band.photo ? "pt-[180px] md:pt-[250px]" : "pt-14 md:pt-20"} flex flex-col gap-8`}>
          <div className="flex flex-col gap-3">
            <span className="text-caption font-semibold tracking-[0.16em] uppercase text-paper/75">{eyebrow}</span>
            <h1 className="headline text-hero md:text-[80px] leading-[0.92] text-balance">{band.name}</h1>
            {(band.genres.length > 0 || band.status !== "active") && (
              <div className="flex flex-wrap gap-1.5">
                {band.genres.map((g) => (
                  <span key={g} className="h-8 px-3 rounded-full bg-riser/90 text-footnote font-medium flex items-center">
                    {g}
                  </span>
                ))}
                <span className={`h-8 px-3 rounded-full text-footnote font-semibold flex items-center ${band.status === "done" ? "bg-riser/90 text-smoke" : "bg-tungsten/16 text-tungsten"}`}>
                  {STATUS_LABEL[band.status]}
                </span>
              </div>
            )}
            <div className="pt-1">
              <BandActions id={band.id} name={band.name} url={url} signedIn={signedIn} isMember={band.isMember} />
            </div>
          </div>

          {band.bio && <p className="text-body leading-[1.55] text-paper/90 max-w-[620px] whitespace-pre-line -mt-2">{band.bio}</p>}

          {band.spots.map((s) => (
            <SpotCard key={s.id} spot={s} band={band} signedIn={signedIn} />
          ))}

          {band.shows.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-title3 font-bold tracking-[-0.02em]">Next shows</h2>
              <ul className="flex flex-col rounded-card-lg bg-stage divide-y divide-paper/8 max-w-[620px]">
                {band.shows.map((s) => {
                  const d = showDate(s.date);
                  const bill = [...s.withBands.map((b) => b.name), s.withText].filter(Boolean).join(", ");
                  return (
                    <li key={s.id} className="flex items-center gap-3.5 px-4 py-3">
                      <span className="w-11 flex flex-col items-center shrink-0">
                        <span className="text-caption font-bold uppercase tracking-[0.08em] text-tungsten">{d.month}</span>
                        <span className="text-title2 font-bold leading-none mt-0.5">{d.day}</span>
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-body font-semibold truncate">{s.venue}</span>
                        <span className="text-footnote text-smoke">
                          {[d.weekday + (s.time ? ` ${s.time}` : ""), s.city, bill && `with ${bill}`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {s.ticketUrl && (
                        <a href={s.ticketUrl} target="_blank" rel="noopener noreferrer" className="hit-slop relative h-8 px-3.5 rounded-full border border-paper/20 text-footnote font-semibold flex items-center hover:bg-paper/8 transition shrink-0">
                          Tickets
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-title3 font-bold tracking-[-0.02em]">{before.length && now.length ? "Lineup now" : "Lineup"}</h2>
            <MemberGrid members={lineup} spots={now.length ? band.spots : []} signedIn={signedIn} sample={band.sample} />
          </section>

          {before.length > 0 && now.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-body font-bold text-smoke">Played in it before</h2>
              <ul className="flex flex-col gap-2.5">
                {before.map((m) => (
                  <li key={m.username}>
                    <Link href={`/@${m.username}`} className="flex items-center gap-3 group">
                      <span className="relative size-10 rounded-full overflow-hidden shrink-0" style={{ background: artistTint(m.username) }}>
                        {m.photo ? (
                          <FadeImg src={m.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-callout font-bold">{m.name.slice(0, 1)}</span>
                        )}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-callout font-semibold group-hover:underline underline-offset-2">{m.name}</span>
                        <span className="text-footnote text-smoke">
                          {m.role || m.instrument} · {m.endYear === m.startYear ? m.startYear : `${m.startYear} to ${m.endYear}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {band.tracks.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-title3 font-bold tracking-[-0.02em]">Music</h2>
              <ul className="flex flex-col rounded-card-lg bg-stage divide-y divide-paper/8 max-w-[620px]">
                {band.tracks.map((t) => (
                  <li key={t.id}>
                    <a href={t.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-paper/4">
                      <span className="size-10 rounded-full bg-paper text-ink flex items-center justify-center shrink-0" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 4.5v15l13-7.5z" />
                        </svg>
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-callout font-semibold truncate">{t.title || `${PROVIDER_LABEL[t.provider]} track`}</span>
                        <span className="text-footnote text-smoke">
                          {PROVIDER_LABEL[t.provider]} · added by {t.by}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {band.sharedStage.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-title3 font-bold tracking-[-0.02em]">Shared the stage with</h2>
              <ul className="hscroll flex gap-2.5 -mx-5 px-5 md:mx-0 md:px-0">
                {band.sharedStage.map((b) => (
                  <li key={b.id} className="shrink-0">
                    <Link href={`/b/${b.id}`} className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-tile bg-stage hover:bg-riser transition">
                      <span className="relative size-11 rounded-[13px] overflow-hidden shrink-0" style={{ background: nameWash(b.name) }}>
                        {b.photo && <FadeImg src={b.photo} alt="" className="absolute inset-0 size-full object-cover" />}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-callout font-semibold whitespace-nowrap">{b.name}</span>
                        <span className="text-caption text-smoke">
                          {b.shows} {b.shows === 1 ? "show" : "shows"} together
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-footnote text-smoke text-pretty max-w-[520px]">
            Everyone here confirmed they played in {band.name}. Played in it too? Ask a member to tag you on their project, and you&apos;ll show up here.
          </p>

          {!signedIn && (
            <section className="p-px bg-paper/20 rounded-sheet">
              <div className="rounded-[24.5px] bg-stage p-6 flex flex-col gap-3">
                <h2 className="headline text-title-lg">Put your band on Mixstro</h2>
                <p className="text-callout text-smoke leading-relaxed max-w-[460px]">
                  Every band you&apos;ve played in, confirmed by your bandmates, with the tracks and shows to prove it. Free.
                </p>
                <div className="pt-1">
                  <ButtonLink href="/" className="h-12 !w-auto text-body px-6 inline-flex">
                    Get started
                  </ButtonLink>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

/** Where "I'm a drummer" goes: the Board post to answer, or signup first. */
function spotHref(spot: BandSpot, signedIn: boolean, sample?: boolean) {
  if (sample) return "/board";
  return signedIn ? `/board/${spot.id}` : "/";
}

function SpotCard({ spot, band, signedIn }: { spot: BandSpot; band: BandPage; signedIn: boolean }) {
  return (
    <section className="rounded-panel p-5 border border-tungsten/35 bg-[linear-gradient(160deg,rgb(255_178_69/0.14),var(--color-stage)_60%)] flex flex-col gap-1.5 max-w-[620px]" aria-label="Open spot">
      <span className="text-caption font-semibold tracking-[0.16em] uppercase text-tungsten">Open spot</span>
      <h2 className="text-title2 font-bold tracking-[-0.02em]">{spot.title.replace(`${band.name}: `, "").replace(/^looking/, "Looking")}</h2>
      {(spot.details || spot.pay) && (
        <p className="text-subhead text-smoke leading-[1.45]">{[spot.details, spot.paid ? spot.pay || "Paid" : null].filter(Boolean).join(" · ")}</p>
      )}
      <div className="flex items-center gap-3 pt-2.5">
        {band.isMember ? (
          <Link href={`/bands/${band.id}`} className="h-11 px-4 rounded-full glass text-subhead font-semibold flex items-center">
            Manage
          </Link>
        ) : spot.answered ? (
          <span className="h-10 px-4 rounded-full bg-riser text-subhead font-semibold flex items-center text-smoke">You asked</span>
        ) : (
          <Link href={spotHref(spot, signedIn, band.sample)} className="h-11 px-4 rounded-full bg-paper text-ink text-subhead font-semibold flex items-center hover:bg-white transition">
            {spotAnswer(spot.role)}
          </Link>
        )}
        {spot.asked > 0 && (
          <span className="text-footnote text-smoke">
            {spot.asked} {spot.asked === 1 ? "musician" : "musicians"} asked
          </span>
        )}
      </div>
    </section>
  );
}

function MemberGrid({ members, spots, signedIn, sample }: { members: BandMember[]; spots: BandSpot[]; signedIn: boolean; sample?: boolean }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {members.map((m) => (
        <li key={m.username}>
          <Link href={`/@${m.username}`} className="group flex flex-col gap-2.5">
            <span className="relative block aspect-[4/5] rounded-card-lg overflow-hidden bg-riser" style={m.photo ? undefined : { background: artistTint(m.username) }}>
              {m.photo ? (
                <FadeImg src={m.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition group-hover:scale-[1.03]" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center headline text-display-lg text-paper/80">{m.name.slice(0, 1)}</span>
              )}
            </span>
            <span className="flex flex-col gap-0.5 px-0.5">
              <span className="text-body font-semibold flex items-center gap-1">
                {m.name}
                {m.verified && <VerifiedMark size={15} className="text-paper" />}
              </span>
              <span className="text-footnote text-paper/80 truncate">{m.role || m.instrument}</span>
              <span className="text-caption text-smoke">{m.endYear === undefined ? `Since ${m.startYear}` : m.endYear === m.startYear ? `${m.startYear}` : `${m.startYear} to ${m.endYear}`}</span>
            </span>
          </Link>
        </li>
      ))}
      {spots
        .filter((s) => s.role)
        .map((s) => (
          <li key={`spot-${s.id}`}>
            <Link href={sample ? "/board" : signedIn ? `/board/${s.id}` : "/"} className="group flex flex-col gap-2.5" aria-label={`Open spot: ${s.role}`}>
              <span className="relative aspect-[4/5] rounded-card-lg border-[1.5px] border-dashed border-tungsten/55 flex flex-col items-center justify-center gap-1 text-tungsten transition group-hover:bg-tungsten/6">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-subhead font-semibold">{s.role}</span>
              </span>
              <span className="flex flex-col gap-0.5 px-0.5">
                <span className="text-body font-semibold text-tungsten">You?</span>
                <span className="text-footnote text-smoke">Open spot</span>
              </span>
            </Link>
          </li>
        ))}
    </ul>
  );
}
