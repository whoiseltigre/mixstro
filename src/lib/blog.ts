import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

/**
 * Blog posts live as Markdown files in content/blog/<slug>.md.
 * Frontmatter fields (shared with the website design work):
 *   title, slug, date (ISO), updated?, description, excerpt, cover?, cover_alt?, tags[], author, old_urls[]
 * Files starting with "_" are ignored.
 */
export type PostMeta = {
  title: string;
  slug: string;
  date: string;
  updated?: string;
  description: string;
  excerpt: string;
  cover?: string;
  cover_alt?: string;
  tags: string[];
  author: string;
  old_urls: string[];
  readingMinutes: number;
};

export type Faq = { question: string; answer: string };
export type Post = PostMeta & { html: string; faqs: Faq[] };

/** Author bylines. Keep bios factual: they feed the Person schema on every post. */
export const AUTHORS: Record<string, { bio: string; jobTitle: string }> = {
  "Taylor Greigh": {
    jobTitle: "Guitarist",
    bio: "Taylor Greigh is a guitarist who has been playing for more than 20 years, across a wide range of gear, bands and gigs. Taylor builds Mixstro.",
  },
};

/** Pulls question/answer pairs from a trailing "## FAQ" section (### question, then answer paragraphs). */
function extractFaqs(body: string): Faq[] {
  const m = body.match(/^## FAQ\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m);
  if (!m) return [];
  return m[1]
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const [q, ...rest] = chunk.split("\n");
      const answer = rest.join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
      return { question: q.trim(), answer };
    })
    .filter((f) => f.question && f.answer);
}

/** Anchors on H2s (for links to a section) and a class on the opening "short answer" paragraph. */
function decorate(html: string) {
  const used = new Set<string>();
  return html
    .replace(/^<p><strong>The short answer:?<\/strong>\s*([a-z])/, (_, c: string) => `<p class="mxb-answer"><strong>The short answer</strong>${c.toUpperCase()}`)
    .replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner: string) => {
      const base = inner.replace(/<[^>]+>/g, "").toLowerCase().replace(/&[a-z#0-9]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
      let id = base;
      for (let i = 2; used.has(id); i++) id = `${base}-${i}`;
      used.add(id);
      return `<h2 id="${id}">${inner}</h2>`;
    });
}

const DIR = path.join(process.cwd(), "content", "blog");

/** Public origin of the marketing site, where the blog lives (mixstro.com/blog). */
export const SITE_URL = "https://mixstro.com";

/** Minimal YAML frontmatter parser: `key: value` strings and `key: [a, b]` or `- item` lists. */
function parseFrontmatter(raw: string): { data: Record<string, string | string[]>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      (data[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === "") {
      data[key] = [];
      listKey = key;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter(Boolean);
      listKey = null;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return { data, body: m[2] };
}

function unquote(s: string) {
  const t = s.trim();
  // Double-quoted YAML strings can escape quotes and backslashes (\" and \\).
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\(["\\])/g, "$1");
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  return t;
}

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

function load(file: string): Post {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const { data, body } = parseFrontmatter(raw);
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    title: str(data.title) ?? file,
    slug: str(data.slug) ?? file.replace(/\.md$/, ""),
    date: str(data.date) ?? "",
    updated: str(data.updated),
    description: str(data.description) ?? "",
    excerpt: str(data.excerpt) ?? "",
    cover: str(data.cover) || undefined,
    cover_alt: str(data.cover_alt) || undefined,
    tags: list(data.tags),
    author: str(data.author) ?? "Mixstro",
    old_urls: list(data.old_urls),
    readingMinutes: Math.max(1, Math.round(words / 230)),
    html: decorate(marked.parse(body, { async: false })),
    faqs: extractFaqs(body),
  };
}

function files() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
}

export function getAllPosts(): PostMeta[] {
  return files()
    .map((f) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { html, faqs, ...meta } = load(f);
      return meta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | undefined {
  return files().map(load).find((p) => p.slug === slug);
}

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** The first tag is the post's category: it drives the cover art and the topic filter. */
export function category(p: Pick<PostMeta, "tags">) {
  return p.tags[0] ?? "Music";
}

/** Up to n other posts, same category first, then the newest. */
export function relatedPosts(slug: string, n = 3): PostMeta[] {
  const all = getAllPosts();
  const me = all.find((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  if (!me) return others.slice(0, n);
  const score = (p: PostMeta) => p.tags.filter((t) => me.tags.includes(t)).length;
  return [...others].sort((a, b) => score(b) - score(a)).slice(0, n);
}
