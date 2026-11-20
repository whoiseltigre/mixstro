import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/blog";
import { generateNames } from "@/lib/band-names/generate.ts";
import { GENRE_PAGES, type GenrePage } from "@/lib/band-names/genre-pages";
import { startBandUrl } from "@/lib/band-names/client";
import { Generator } from "./generator";

export const TITLE = "Band Name Generator: Free Ideas, Checked Against Real Bands";
export const DESCRIPTION =
  "Get 12 band name ideas by genre and vibe, shortlist your favorites and check each one against real artists. Let the band vote with one link. Free, no sign-up.";

const FAQS = [
  {
    q: "How do I know if a band name is taken?",
    a: "Shortlist a name and tap Check. We search MusicBrainz, an open database of over two million artists, for the same or a very similar name. No result is a good sign, not a legal clearance: also search Spotify, Bandcamp and Instagram, and look up trademarks if you plan to sell merch.",
  },
  {
    q: "Can I use a name from this generator?",
    a: "Yes. The names are free to use and we don't keep any claim on them. Every suggestion is screened against a list of well-known bands, and spelling tricks of those names, so you start from something original.",
  },
  {
    q: "What makes a good band name?",
    a: "Short enough to fit on a kick drum, easy to say out loud at a loud bar, and easy to spell when someone searches for you. It should fit the music: a folk duo and a death metal band shouldn't be able to swap names.",
  },
  {
    q: "How do we pick one as a band?",
    a: "Shortlist three, share them with your bandmates and let everyone sleep on it. Say each name out loud as if you're being introduced on stage. The one nobody hates usually wins.",
  },
];

/** The generator page; with `page`, one of the genre versions (/band-name-generator/metal). */
export function GeneratorPage({ page }: { page?: GenrePage }) {
  const path = page ? `/band-name-generator/${page.slug}` : "/band-name-generator";
  const initial = generateNames({ seed: Math.floor(Date.now() / 3_600_000), genre: page?.genre });
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: page ? `Mixstro ${page.h1.toLowerCase()}` : "Mixstro band name generator",
      url: `${SITE_URL}${path}`,
      applicationCategory: "MusicApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: page?.dek ?? DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <main>
      <JsonLd data={schema} />
      <div className="mxb-glow" aria-hidden="true" />
      <div className="mxb-wrap">
        <header className="mxb-post-hero">
          <nav className="mxb-crumb" aria-label="Breadcrumb">
            <span>Free tools</span>
            <span aria-hidden="true">/</span>
            {page ? <Link href="/band-name-generator">Band names</Link> : <span>Band names</span>}
            {page && <span aria-hidden="true">/</span>}
            {page && <span>{page.label}</span>}
          </nav>
          <h1>{page?.h1 ?? "Band name generator"}</h1>
          <p className="dek">{page?.dek ?? "Twelve ideas at a time, by genre and vibe. Shortlist three, check them against real bands, then let the band vote."}</p>
        </header>

        <Generator initial={initial} genre={page?.genre} />

        <article className="mxb-article">
          {page && (
            <>
              <h2>What makes a good {page.label.toLowerCase()} name</h2>
              <p>{page.intro}</p>
              <ul>
                {page.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          <h2>How the generator works</h2>
          <p>
            Pick a genre and a vibe, or leave both open. Add a word you like and choose whether it should appear in the name or only set the mood. Turn on stylized
            spelling if you want names with dropped vowels or a V for a U. Every batch skips well-known band names and near copies of them, plus anything crude.
          </p>
          <h2>Before you settle on a name</h2>
          <ul>
            <li><strong>Say it out loud.</strong> Imagine the sound person introducing you. If it gets mumbled, it gets forgotten.</li>
            <li><strong>Search it.</strong> Check streaming services, Bandcamp and Instagram handles, not only the check on this page.</li>
            <li><strong>Grab the handles.</strong> A matching Instagram and TikTok name is worth more than a clever pun.</li>
            <li><strong>Agree as a band.</strong> Write down who came up with it and that it belongs to the band. Our <Link href="/blog/how-to-start-a-band">guide to starting a band</Link> covers the rest of that first conversation.</li>
          </ul>
          <h2>Let the band vote</h2>
          <p>
            Shortlist three names and tap Let the band vote. You get one link for the group chat. Everyone votes in one tap without signing up, sees the totals
            after voting, and can change their mind. Later, open a new round on the same link to pick your next single or your set closer.
          </p>
          <h2>Band names by genre</h2>
          <p className="bng-genres">
            {GENRE_PAGES.map((g) => (
              <Link key={g.slug} href={`/band-name-generator/${g.slug}`} aria-current={g.slug === page?.slug ? "page" : undefined}>
                {g.label}
              </Link>
            ))}
          </p>
          <h2>Questions</h2>
          {FAQS.map((f) => (
            <section key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </section>
          ))}
        </article>

        <section className="mxb-join">
          <h2>Got the name? Now find the band.</h2>
          <p>Mixstro is where musicians put every band they&apos;ve played in on one page and find the people for the next one. Free.</p>
          <a className="mxb-btn paper" href={startBandUrl()}>Claim your free profile</a>
        </section>
      </div>
    </main>
  );
}
