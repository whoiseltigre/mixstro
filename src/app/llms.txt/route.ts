import { AUTHORS, SITE_URL, authorPath, getAllPosts } from "@/lib/blog";

export const dynamic = "force-static";

/** llms.txt (llmstxt.org): a plain-text map of the site for AI assistants and answer engines. */
export function GET() {
  const posts = getAllPosts();
  const lines = [
    "# Mixstro",
    "",
    "> Mixstro is a free app where musicians put every band and project they've played in on one profile, then find bandmates, replace band members, make music together and find gigs. It runs on the web at app.mixstro.com.",
    "",
    "Mixstro is for musicians of every level, from first jam to sold-out show. People use it to:",
    "- Show their whole musical history, including old bands and songs",
    "- Find musicians to start a band or replace a member, searched by instrument, genre, influences and distance",
    "- Network, plan jams and find gigs and fill-in work",
    "",
    "## Main pages",
    `- [Homepage](${SITE_URL}/): what Mixstro is and how it works`,
    "- [Create a profile](https://app.mixstro.com): sign up free",
    `- [Blog](${SITE_URL}/blog): guides for musicians`,
    "",
    "## Guides",
    ...posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`),
    "",
    "## About the authors",
    ...Object.entries(AUTHORS).map(([name, a]) => `- [${name}](${SITE_URL}${authorPath(a)}): ${a.bio}`),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
