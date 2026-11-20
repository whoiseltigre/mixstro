import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/blog";
import { generateNames } from "@/lib/band-names/generate.ts";
import { Generator } from "./generator";

const PATH = "/band-name-generator";
const TITLE = "Band Name Generator: Free Ideas, Checked Against Real Bands";
const DESCRIPTION =
  "Get 12 band name ideas by genre and vibe, shortlist your favorites and check each one against real artists before you print the shirts. Free, no sign-up.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: PATH },
  title: `${TITLE} | Mixstro`,
  description: DESCRIPTION,
  openGraph: { type: "website", url: PATH, title: "Band name generator · Mixstro", description: DESCRIPTION, images: [{ url: "/site/v1/og-card.jpg", width: 1200, height: 630 }] },
};

// A fresh first batch every hour, rendered on the server so the names are in the HTML.
export const revalidate = 3600;

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

export default function BandNameGeneratorPage() {
  const initial = generateNames({ seed: Math.floor(Date.now() / 3_600_000) });
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Mixstro band name generator",
      url: `${SITE_URL}${PATH}`,
      applicationCategory: "MusicApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: DESCRIPTION,
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
            <span>Band names</span>
          </nav>
          <h1>Band name generator</h1>
          <p className="dek">Twelve ideas at a time, by genre and vibe. Shortlist three, check them against real bands, then share them with the band.</p>
        </header>

        <Generator initial={initial} />

        <article className="mxb-article">
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
          <a className="mxb-btn paper" href="https://app.mixstro.com/?utm_source=band-name-generator&utm_medium=tool&utm_campaign=footer">Claim your free profile</a>
        </section>
      </div>
    </main>
  );
}
