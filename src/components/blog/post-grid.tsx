"use client";

import Link from "next/link";
import { useState } from "react";

export type GridPost = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  cat: string;
  minutes: number;
  accent: string;
  glow: string;
};

/** "All posts" stage cards with topic tabs. Every card is in the server HTML; tabs only hide some. */
export function PostGrid({ posts, topics }: { posts: GridPost[]; topics: string[] }) {
  const [topic, setTopic] = useState("All");
  return (
    <>
      <div className="mxb-tabs" role="group" aria-label="Filter by topic">
        {["All", ...topics].map((t) => (
          <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="mxb-cards">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="mxb-card"
            hidden={topic !== "All" && !p.tags.includes(topic)}
            style={{ "--accent": p.accent, "--glow": p.glow } as React.CSSProperties}
          >
            <span className="meta">
              {p.cat} · {p.minutes} min read
            </span>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
