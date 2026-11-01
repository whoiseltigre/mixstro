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

export type Post = PostMeta & { html: string };

const DIR = path.join(process.cwd(), "content", "blog");

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
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
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
    html: marked.parse(body, { async: false }),
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
      const { html, ...meta } = load(f);
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
