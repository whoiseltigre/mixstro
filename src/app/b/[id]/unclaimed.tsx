import Link from "next/link";
import { ButtonLink, Wordmark } from "@/components/ui";
import { BAND_GLOW } from "@/lib/projects";
import { ClaimButton, RemoveLink, SeatList } from "@/components/band-claim";
import type { UnclaimedBand } from "@/lib/band-claim";
import { possessive } from "@/lib/band-shared";
import { Toaster } from "@/components/toast";

/**
 * A band page nobody in the band has claimed yet: only public facts (name, city, genres, the
 * lineup from MusicBrainz and their official links), labeled as such. No photo, no bio, no
 * music, and noindex until someone in the band claims it.
 */
export function UnclaimedBandView({ band, signedIn }: { band: UnclaimedBand; signedIn: boolean }) {
  const place = band.city?.split(",")[0];
  const eyebrow = ["Band", place].filter(Boolean).join(" · ");
  const links = { instagramUrl: band.instagramUrl, websiteUrl: band.websiteUrl };
  const pending = band.myClaim?.status === "pending";

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
            <ButtonLink href="/" variant="glass" className="h-10 !w-auto px-4 text-subhead">
              Join Mixstro
            </ButtonLink>
          )}
        </header>

        <main className="pt-14 md:pt-20 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="text-caption font-semibold tracking-[0.16em] uppercase text-paper/75">{eyebrow}</span>
            <h1 className="headline text-hero leading-[0.92] text-balance">{band.name}</h1>
            <div className="flex flex-wrap gap-1.5">
              <span className="h-8 px-3 rounded-full border border-dashed border-paper/30 text-footnote font-semibold flex items-center text-paper/80">
                Unclaimed · info from MusicBrainz
              </span>
              {band.genres.map((g) => (
                <span key={g} className="h-8 px-3 rounded-full bg-riser/90 text-footnote font-medium flex items-center">
                  {g}
                </span>
              ))}
            </div>
          </div>

          <section className="rounded-panel p-5 border border-tungsten/35 bg-[linear-gradient(160deg,rgb(255_178_69/0.14),var(--color-stage)_60%)] flex flex-col gap-2 max-w-[620px]" aria-label="Claim this page">
            <span className="text-caption font-semibold tracking-[0.16em] uppercase text-tungsten">{pending ? "Your claim" : "In this band?"}</span>
            <h2 className="text-title2 font-semibold tracking-[-0.01em]">
              {pending ? (band.myClaim?.proofUrl ? "We're checking your code" : "Post your code to finish") : `Make ${possessive(band.name)} page yours`}
            </h2>
            <p className="text-subhead text-smoke leading-[1.45] text-pretty">
              {pending
                ? band.myClaim?.proofUrl
                  ? "Someone at Mixstro checks it within a day. Then the page is yours."
                  : `Post ${band.myClaim?.code} on the band's official Instagram or website, then send us the link.`
                : "Add your photo, music, shows and open spots. Every member gets the band on their profile, confirmed by the others. Free."}
            </p>
            <div className="pt-2">
              <ClaimButton band={band.id} name={band.name} signedIn={signedIn} myClaim={band.myClaim} {...links} />
            </div>
          </section>

          {band.seats.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-title3 font-semibold tracking-[-0.01em]">Lineup</h2>
                <p className="text-footnote text-smoke">From MusicBrainz. Is one of these you? Claim your spot.</p>
              </div>
              <SeatList band={band.id} name={band.name} seats={band.seats} signedIn={signedIn} myClaim={band.myClaim} {...links} />
            </section>
          )}

          {(band.instagramUrl || band.websiteUrl) && (
            <section className="flex flex-col gap-2">
              <h2 className="text-body font-bold text-smoke">Official links</h2>
              <div className="flex flex-wrap gap-2">
                {band.instagramUrl && (
                  <a href={band.instagramUrl} target="_blank" rel="noopener noreferrer nofollow" className="h-10 px-4 rounded-full border border-paper/20 text-subhead font-semibold flex items-center hover:bg-paper/8 transition">
                    Instagram
                  </a>
                )}
                {band.websiteUrl && (
                  <a href={band.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="h-10 px-4 rounded-full border border-paper/20 text-subhead font-semibold flex items-center hover:bg-paper/8 transition">
                    Website
                  </a>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-2 max-w-[520px]">
            <p className="text-footnote text-smoke text-pretty">
              Nobody in {band.name} has claimed this page yet. It shows only public info
              {band.mbid ? (
                <>
                  {" "}from{" "}
                  <a href={`https://musicbrainz.org/artist/${band.mbid}`} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
                    MusicBrainz
                  </a>
                </>
              ) : null}{" "}
              and isn&apos;t listed on Google or in Mixstro search.
            </p>
            <RemoveLink band={band.id} name={band.name} />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
