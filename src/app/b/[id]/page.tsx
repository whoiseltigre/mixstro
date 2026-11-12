import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, VerifiedMark, Wordmark } from "@/components/ui";
import { artistTint } from "@/lib/artists";
import { bandYears, getBandPage, type BandMember } from "@/lib/band-page";
import { PROVIDER_LABEL } from "@/lib/clips";
import { APP_ORIGIN } from "@/lib/public-profile";
import { JsonLd } from "@/components/json-ld";
import { BAND_GLOW } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

/**
 * A band's page: everyone who confirmed they played in it (each confirmation is a
 * bandmate vouching for the others), their roles and years, and the band's music.
 * Opens signed out, so a band can share one link.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const band = await getBandPage(id);
  if (!band) return { title: "Mixstro" };
  const names = band.members.map((m) => m.name);
  const title = `${band.name} on Mixstro`;
  const description = `${band.name} (${bandYears(band)}): ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`}. Listen and meet the band on Mixstro.`;
  return {
    title,
    description,
    alternates: { canonical: `${APP_ORIGIN}/b/${band.id}` },
    openGraph: { type: "website", title, description, url: `${APP_ORIGIN}/b/${band.id}`, siteName: "Mixstro" },
    twitter: { card: "summary", title, description },
  };
}

export default async function BandPage({ params }: Params) {
  const { id } = await params;
  const band = await getBandPage(id);
  if (!band) notFound();
  const supabase = await createClient();
  const signedIn = Boolean(supabase && (await supabase.auth.getClaims()).data?.claims?.sub);
  const now = band.members.filter((m) => m.endYear === undefined);
  const before = band.members.filter((m) => m.endYear !== undefined);

  return (
    <div className="isolate relative min-h-dvh w-full">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10" style={{ background: BAND_GLOW }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10 bg-gradient-to-b from-ink/30 to-ink" />
      <div className="w-full mx-auto max-w-[560px] md:max-w-[1000px] px-5 md:px-10 pb-32 md:pb-20">

      <header className="pt-safe mt-3 md:mt-6 flex items-center justify-between">
        <Link href={signedIn ? "/discover" : "/"} aria-label="Mixstro home">
          <Wordmark size={24} />
        </Link>
        {!signedIn && (
          <ButtonLink href="/" variant="glass" className="h-10 !w-auto px-4 text-[14px]">
            Join Mixstro
          </ButtonLink>
        )}
      </header>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicGroup",
          name: band.name,
          url: `${APP_ORIGIN}/b/${band.id}`,
          foundingDate: String(band.startYear),
          member: band.members.map((m) => ({
            "@type": "OrganizationRole",
            ...(m.role && { roleName: m.role }),
            startDate: String(m.startYear),
            ...(m.endYear !== undefined && { endDate: String(m.endYear) }),
            member: { "@type": "Person", name: m.name, url: `${APP_ORIGIN}/@${m.username}` },
          })),
        }}
      />
      <main className="pt-14 md:pt-20 flex flex-col gap-8">
        <div className="flex flex-col gap-2.5">
          <span className="text-[12px] font-semibold tracking-[0.16em] uppercase text-smoke">
            Band · {bandYears(band)} · {band.members.length} {band.members.length === 1 ? "member" : "members"} on Mixstro
          </span>
          <h1 className="headline text-[52px] md:text-[80px] leading-[0.92] text-balance">{band.name}</h1>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-bold tracking-[-0.02em]">{before.length ? "Lineup now" : "Lineup"}</h2>
          <MemberGrid members={now.length ? now : band.members} />
        </section>

        {before.length > 0 && now.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">Played in it before</h2>
            <MemberGrid members={before} />
          </section>
        )}

        {band.tracks.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[20px] font-bold tracking-[-0.02em]">Music</h2>
            <ul className="flex flex-col rounded-[22px] bg-stage divide-y divide-paper/8">
              {band.tracks.map((t) => (
                <li key={t.id}>
                  <a
                    href={t.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-paper/4"
                  >
                    <span className="size-10 rounded-full bg-paper text-ink flex items-center justify-center shrink-0" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[15px] font-semibold truncate">{t.title || `${PROVIDER_LABEL[t.provider]} track`}</span>
                      <span className="text-[13px] text-smoke">
                        {PROVIDER_LABEL[t.provider]} · added by {t.by}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[13px] text-smoke text-pretty max-w-[520px]">
          Everyone here confirmed they played in {band.name}. Played in it too? Ask a member to tag you on their project, and you&apos;ll show up here.
        </p>

        {!signedIn && (
          <section className="gel-rim rounded-[26px]">
            <div className="rounded-[24.5px] bg-stage p-6 flex flex-col gap-3">
              <h2 className="headline text-[28px]">Put your band on Mixstro</h2>
              <p className="text-[15px] text-smoke leading-relaxed max-w-[460px]">
                Every band you&apos;ve played in, confirmed by your bandmates, with the tracks to prove it. Free.
              </p>
              <div className="pt-1">
                <ButtonLink href="/" className="h-12 !w-auto text-[16px] px-6 inline-flex">
                  Get started
                </ButtonLink>
              </div>
            </div>
          </section>
        )}
      </main>
      </div>
    </div>
  );
}

function MemberGrid({ members }: { members: BandMember[] }) {
  return (
    <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {members.map((m) => (
        <li key={m.username}>
          <Link href={`/@${m.username}`} className="group flex flex-col gap-2.5">
            <span className="relative block aspect-[4/5] rounded-[22px] overflow-hidden bg-riser" style={m.photo ? undefined : { background: artistTint(m.username) }}>
              {m.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition group-hover:scale-[1.03]" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center headline text-[44px] text-paper/80">{m.name.slice(0, 1)}</span>
              )}
            </span>
            <span className="flex flex-col gap-0.5 px-0.5">
              <span className="text-[16px] font-semibold flex items-center gap-1">
                {m.name}
                {m.verified && <VerifiedMark size={15} className="text-paper" />}
              </span>
              <span className="text-[13px] text-paper/80 truncate">{m.role || m.instrument}</span>
              <span className="text-[12px] text-smoke">{m.endYear === undefined ? `Since ${m.startYear}` : m.endYear === m.startYear ? `${m.startYear}` : `${m.startYear} to ${m.endYear}`}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
