/**
 * Blog cover art, drawn the same way as the homepage blog cards: a House Lights
 * gradient with record grooves spinning off a label. Rendered as inline SVG on the
 * server, so it costs no images, no layout shift and no JavaScript.
 */

const GRADIENTS: Record<string, [string, string, string]> = {
  Bands: ["#FFB245", "#F7BF77", "#FFACBA"],
  Networking: ["#FFB245", "#F7BF77", "#FFACBA"],
  Gear: ["#F7BF77", "#FFB245", "#FFACBA"],
  Recording: ["#F7BF77", "#FFB245", "#FFACBA"],
  Production: ["#B5C5FF", "#8FD4EC", "#67E2DA"],
  Songwriting: ["#B5C5FF", "#8FD4EC", "#67E2DA"],
  Guitar: ["#67E2DA", "#8FD4EC", "#B5C5FF"],
  Live: ["#FFACBA", "#F9B69A", "#F7BF77"],
  Metal: ["#FFACBA", "#D9B8E6", "#B5C5FF"],
  Gigs: ["#FFB245", "#FFACBA", "#B5C5FF"],
  Profile: ["#FFB245", "#FFACBA", "#B5C5FF"],
};
const FALLBACK: [string, string, string] = ["#FFB245", "#F7BF77", "#FFACBA"];

export function coverGradient(cat: string) {
  const [a, b, c] = GRADIENTS[cat] ?? FALLBACK;
  return `linear-gradient(150deg, ${a}, ${b} 55%, ${c})`;
}

/** Small stable number from a slug, so each post keeps the same artwork. */
function seedOf(slug: string) {
  let h = 7;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h % 23) + 3;
}

export function Cover({
  slug,
  cat,
  label = true,
  rings = 46,
  className,
}: {
  slug: string;
  cat: string;
  label?: boolean;
  rings?: number;
  className?: string;
}) {
  const s = seedOf(slug);
  const W = 400;
  const H = 300;
  const cx = W * (0.62 + ((s * 37) % 25) / 100);
  const cy = H * (0.1 + ((s * 53) % 18) / 100);
  const R = Math.hypot(W, H);
  const step = R / rings;
  return (
    <div className={`mxb-cover ${className ?? ""}`} style={{ background: coverGradient(cat) }} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#0F0D0B" strokeOpacity={0.16}>
          {Array.from({ length: rings - 1 }, (_, i) => {
            const k = i + 1;
            const wobble = ((k * s) % 7) * 0.6;
            return (
              <ellipse
                key={k}
                cx={cx}
                cy={cy}
                rx={k * step + wobble}
                ry={k * step + wobble * 0.6}
                strokeWidth={k % 5 === 0 ? 1.6 : 0.75}
              />
            );
          })}
        </g>
        <circle cx={cx} cy={cy} r={R * 0.06} fill="#0F0D0B" fillOpacity={0.85} />
        <circle cx={cx + R * 0.03} cy={cy - R * 0.012} r={R * 0.008} fill="#F5F1EC" fillOpacity={0.9} />
      </svg>
      {label && <b>{cat}</b>}
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  Bands: "#FFB245",
  Networking: "#FFB245",
  Gear: "#F7BF77",
  Recording: "#F7BF77",
  Production: "#B5C5FF",
  Songwriting: "#B5C5FF",
  Guitar: "#67E2DA",
  Blues: "#67E2DA",
  Live: "#FFACBA",
  Metal: "#B5C5FF",
  Gigs: "#FFACBA",
  Profile: "#FFACBA",
};

/** Text accent and corner glow for a category's stage card. */
export function accentOf(cat: string) {
  const hex = ACCENTS[cat] ?? "#FFB245";
  const n = parseInt(hex.slice(1), 16);
  return { accent: hex, glow: `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},.22)` };
}
