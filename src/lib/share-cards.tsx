import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { yearsLabel, type Project } from "./projects";
import { plays, type PublicPage } from "./public-profile";

/**
 * The link preview (1200x630) and the story card (1080x1920) for a music page.
 * Same look as the app: Ink background, the Tungsten-to-gel stripe, Inter Tight names.
 * No follower counts or rankings, just the person, what they play and their bands.
 */

const INK = "#0F0D0B";
const PAPER = "#F5F1EC";
const SMOKE = "#A8A49E";
const STRIPE = "linear-gradient(90deg, #F7BF77, #FFB245 30%, #FFACBA 60%, #B5C5FF 80%, #67E2DA)";

const asset = (f: string) => readFile(join(process.cwd(), "src/assets/og", f));

let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 600 | 800; style: "normal" }[]> | undefined;
function loadFonts() {
  fonts ??= Promise.all([
    asset("inter-tight-latin-800-normal.woff").then((data) => ({ name: "Inter Tight", data, weight: 800 as const, style: "normal" as const })),
    asset("geist-sans-latin-500-normal.woff").then((data) => ({ name: "Geist", data, weight: 500 as const, style: "normal" as const })),
    asset("geist-sans-latin-600-normal.woff").then((data) => ({ name: "Geist", data, weight: 600 as const, style: "normal" as const })),
  ]);
  return fonts;
}

let lockup: Promise<string> | undefined;
const loadLockup = () => (lockup ??= asset("mixstro-lockup.png").then((b) => `data:image/png;base64,${b.toString("base64")}`));

/** Fetch the photo up front so a slow or broken one falls back to initials instead of failing the card. */
async function photoData(src: string | null, origin: string) {
  if (!src) return null;
  try {
    const res = await fetch(src.startsWith("http") ? src : `${origin}${src}`, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(jpeg|png)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

function meta(page: PublicPage) {
  const p = page.person;
  return [plays(page.instruments.slice(0, 2)), p.genres !== "Open to anything" ? p.genres : "", p.neighborhood].filter(Boolean).join("  ·  ");
}

const nameSize = (name: string, base: number) => (name.length > 14 ? base * 0.62 : name.length > 9 ? base * 0.8 : base);

function Photo({ src, name, w, h, radius = 0 }: { src: string | null; name: string; w: number; h: number; radius?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={w} height={h} style={{ width: w, height: h, objectFit: "cover", borderRadius: radius }} />
  ) : (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "linear-gradient(140deg, #4A3A28, #1A1816)",
        fontFamily: "Inter Tight",
        fontSize: Math.round(w / 3),
        color: PAPER,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function Bands({ projects, size }: { projects: Project[]; size: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.5 }}>
      <div style={{ fontSize: size * 0.62, letterSpacing: "0.14em", textTransform: "uppercase", color: SMOKE, fontWeight: 600 }}>Played in</div>
      {projects.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "baseline", gap: size * 0.5 }}>
          <span style={{ fontSize: size, fontWeight: 600, color: PAPER }}>{p.name}</span>
          <span style={{ fontSize: size * 0.7, color: SMOKE }}>{yearsLabel(p)}</span>
        </div>
      ))}
    </div>
  );
}

/** 1200x630, for Facebook, X, LinkedIn, iMessage and the rest. */
export async function previewCard(page: PublicPage, origin: string, username: string) {
  const [f, logo, photo] = await Promise.all([loadFonts(), loadLockup(), photoData(page.person.photo, origin)]);
  const p = page.person;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", background: INK, color: PAPER, fontFamily: "Geist", position: "relative" }}>
        <div style={{ display: "flex", position: "relative" }}>
          <Photo src={photo} name={p.name} w={500} h={630} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 160, height: 630, backgroundImage: `linear-gradient(90deg, rgba(15,13,11,0), ${INK})` }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "56px 64px 64px 40px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={201} height={40} />
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 18 }}>
            <div style={{ fontSize: 24, color: SMOKE, fontWeight: 500 }}>{meta(page)}</div>
            <div style={{ fontFamily: "Inter Tight", fontSize: nameSize(p.name, 104), lineHeight: 1, letterSpacing: "-0.02em" }}>{p.name}</div>
            <div style={{ display: "flex" }}>
              <div style={{ fontSize: 22, padding: "8px 18px", borderRadius: 999, border: "1.5px solid rgba(245,241,236,0.22)" }}>{p.lookingFor}</div>
            </div>
            {page.projects.length > 0 && (
              <div style={{ display: "flex", marginTop: 14 }}>
                <Bands projects={page.projects.slice(0, 2)} size={28} />
              </div>
            )}
          </div>
          <div style={{ marginTop: 34, fontSize: 22, color: SMOKE }}>{`app.mixstro.com/@${username}`}</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, backgroundImage: STRIPE }} />
      </div>
    ),
    { width: 1200, height: 630, fonts: f, headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
  );
}

/** 1080x1920, for Instagram and TikTok stories. */
export async function storyCard(page: PublicPage, origin: string, username: string) {
  const [f, logo, photo] = await Promise.all([loadFonts(), loadLockup(), photoData(page.person.photo, origin)]);
  const p = page.person;
  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", background: INK, color: PAPER, fontFamily: "Geist", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, backgroundImage: STRIPE }} />
        <div style={{ display: "flex", position: "relative", width: 1080, height: 1160 }}>
          <Photo src={photo} name={p.name} w={1080} h={1160} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 520, backgroundImage: `linear-gradient(180deg, rgba(15,13,11,0), ${INK})` }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "0 84px", marginTop: -180, gap: 26 }}>
          <div style={{ fontSize: 36, color: SMOKE, fontWeight: 500 }}>{meta(page)}</div>
          <div style={{ fontFamily: "Inter Tight", fontSize: nameSize(p.name, 176), lineHeight: 1, letterSpacing: "-0.02em" }}>{p.name}</div>
          <div style={{ display: "flex" }}>
            <div style={{ fontSize: 34, padding: "12px 28px", borderRadius: 999, border: "2px solid rgba(245,241,236,0.24)" }}>{p.lookingFor}</div>
          </div>
          {page.projects.length > 0 && (
            <div style={{ display: "flex", marginTop: 26 }}>
              <Bands projects={page.projects.slice(0, 3)} size={44} />
            </div>
          )}
        </div>
        <div style={{ marginTop: "auto", padding: "0 84px 110px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={241} height={48} />
          <div style={{ fontSize: 34, color: SMOKE }}>{`app.mixstro.com/@${username}`}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: f, headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
  );
}
