import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtistAvatar } from "@/components/artist-avatar";
import { PersonPhoto } from "@/components/person-photo";
import { ProjectList } from "@/components/project-list";
import { HighlightList, OpenToChips } from "@/components/profile-extras";
import { SharePage } from "@/components/share-page";
import { ButtonLink, VerifiedMark, Wordmark } from "@/components/ui";
import { requestOrigin } from "@/lib/origin";
import { getPublicPage, plays } from "@/lib/public-profile";

/**
 * Someone's music page for people without a Mixstro account: what a shared
 * app.mixstro.com/@name link opens. Signed-in members get the full profile instead
 * (middleware decides). No follower counts, no rankings: their music and their bands.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const page = await getPublicPage(username);
  if (!page) return { title: "Mixstro" };
  const origin = await requestOrigin();
  const p = page.person;
  const title = `${p.name} · ${plays(page.instruments.slice(0, 2))} on Mixstro`;
  const bands = page.projects.slice(0, 3).map((x) => x.name);
  const description = [
    `${p.name} plays ${plays(page.instruments).toLowerCase()}${p.neighborhood ? ` in ${p.neighborhood}` : ""}.`,
    bands.length ? `Played in ${bands.join(", ")}.` : "",
    "Listen and connect on Mixstro.",
  ]
    .filter(Boolean)
    .join(" ");
  const image = { url: `${origin}/p/${p.username}/og`, width: 1200, height: 630, alt: `${p.name} on Mixstro` };
  return {
    title,
    description,
    alternates: { canonical: `${origin}/@${p.username}` },
    openGraph: { type: "profile", title, description, url: `${origin}/@${p.username}`, siteName: "Mixstro", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function PublicProfile({ params }: Params) {
  const { username } = await params;
  const page = await getPublicPage(username);
  if (!page) notFound();
  const { person: m, projects, instruments, openTo, highlights } = page;
  const first = m.name.split(" ")[0];
  const origin = await requestOrigin();
  const join = "/";

  return (
    <div className="isolate relative min-h-dvh w-full mx-auto max-w-[560px] md:max-w-[1100px] md:px-10">
      <header className="absolute md:static z-10 inset-x-0 top-0 pt-safe px-5 md:px-0 mt-3 md:mt-6 flex items-center justify-between">
        <Link href={join} aria-label="Mixstro home" className="drop-shadow-[0_1px_8px_rgb(0_0_0/0.6)] md:drop-shadow-none">
          <Wordmark size={24} />
        </Link>
        <ButtonLink href={join} variant="glass" className="h-10 !w-auto px-4 text-[14px]">
          Join Mixstro
        </ButtonLink>
      </header>

      <main className="pb-36 md:pb-20 md:pt-8 md:grid md:grid-cols-[minmax(300px,400px)_1fr] md:gap-x-12 md:items-start">
        <div className="relative h-[420px] md:h-auto md:aspect-[9/10] md:rounded-[28px] md:overflow-hidden md:sticky md:top-8">
          <PersonPhoto person={m} priority sizes="(min-width: 768px) 400px, 100vw" initialsSize={88} className="object-[50%_35%]" />
          <div className="absolute inset-x-0 bottom-0 h-[190px] bg-gradient-to-b from-ink/0 to-ink md:hidden" />
        </div>

        <div className="relative -mt-24 md:mt-0 px-5 md:px-0 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold tracking-[0.16em] uppercase text-smoke">
              {[plays(instruments.slice(0, 2)), m.genres !== "Open to anything" ? m.genres : "", m.neighborhood].filter(Boolean).join(" · ")}
            </span>
            <h1 className="headline text-[48px] md:text-[64px] leading-[0.95] flex items-center gap-2">
              {m.name}
              {m.verified && <VerifiedMark size={28} className="text-paper" />}
            </h1>
            <div className="flex gap-2 flex-wrap text-[13px] pt-1">
              <span className="px-3 py-1.5 rounded-full border border-paper/16">{m.lookingFor}</span>
            </div>
            <OpenToChips ids={openTo} className="pt-1" />
          </div>

          <div className="flex gap-2.5">
            <ButtonLink href={join} className="h-12 text-[16px] min-w-0 flex-1 md:flex-none md:!w-auto md:px-7">
              Connect with {first}
            </ButtonLink>
            <SharePage username={m.username} firstName={first} mine={false} url={`${origin}/@${m.username}`} className="shrink-0 md:px-6" />
          </div>

          {projects.length > 0 ? (
            <div className="pt-2">
              <ProjectList projects={projects} />
            </div>
          ) : (
            <p className="text-[15px] text-smoke">{first} hasn&apos;t added their bands yet.</p>
          )}

          <HighlightList items={highlights} />

          {m.influences.length > 0 && (
            <section className="flex flex-col gap-2.5 pt-2">
              <h2 className="text-[17px] font-semibold">Influences</h2>
              <div className="hscroll flex gap-4 -mx-5 px-5 md:mx-0 md:px-0 md:flex-wrap">
                {m.influences.map((a) => (
                  <div key={a.id} className="w-[88px] shrink-0 flex flex-col items-center gap-2">
                    <ArtistAvatar artist={a} size={80} />
                    <span className="text-[13px] font-semibold truncate max-w-full">{a.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4 gel-rim rounded-[26px]">
            <div className="rounded-[24.5px] bg-stage p-6 flex flex-col gap-3">
              <h2 className="headline text-[28px]">Make your music page</h2>
              <p className="text-[15px] text-smoke leading-relaxed max-w-[460px]">
                Every band you&apos;ve played in, with the tracks to prove it. Then meet musicians near you to start a band, fill a spot, or just jam. Free.
              </p>
              <div className="pt-1">
                <ButtonLink href={join} className="h-12 !w-auto text-[16px] px-6 inline-flex">
                  Get started
                </ButtonLink>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Phones: a slim join bar stays in reach while the page scrolls. */}
      <div className="md:hidden fixed z-20 inset-x-0 bottom-0 px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3 bg-gradient-to-t from-ink via-ink/90 to-ink/0">
        <ButtonLink href={join} className="h-12 text-[16px] w-full">
          Make your own music page
        </ButtonLink>
      </div>
    </div>
  );
}
