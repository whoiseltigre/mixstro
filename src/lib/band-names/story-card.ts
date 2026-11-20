/**
 * A 1080x1920 Instagram/TikTok story image of a shortlist, drawn in the browser.
 * House Lights colors; the site's display face when it has loaded, a system face otherwise.
 */

const W = 1080;
const H = 1920;
const INK = "#0F0D0B";
const PAPER = "#F5F1EC";
const SMOKE = "#A8A49E";
const TUNGSTEN = "#FFB245";
const PINK = "#FFACBA";
const BLUE = "#B5C5FF";
const DISPLAY = '"MX Inter Tight", "Inter Tight", -apple-system, "SF Pro Display", system-ui, sans-serif';
const BODY = '"MX Geist", "Geist", -apple-system, "SF Pro Text", system-ui, sans-serif';

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

/** Largest font size (down to `min`) at which `text` fits in `width`, wrapping to at most two lines. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number, max: number, min: number): { size: number; lines: string[] } {
  for (let size = max; size >= min; size -= 4) {
    ctx.font = `600 ${size}px ${DISPLAY}`;
    if (ctx.measureText(text).width <= width) return { size, lines: [text] };
    // Of the two-line splits that fit, take the most even one ("Pick our / band name", not "Pick / our band name").
    const words = text.split(" ");
    let best: string[] | null = null;
    let widest = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (w <= width && w < widest) [best, widest] = [[a, b], w];
    }
    if (best) return { size, lines: best };
  }
  return { size: min, lines: [text] };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function storyCard(opts: { question: string; options: string[]; link: string; footer?: string }): Promise<Blob> {
  await Promise.all([document.fonts.load(`600 80px ${DISPLAY}`), document.fonts.load(`500 40px ${BODY}`)]).catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W / 2, 260, 900, TUNGSTEN, 0.45);
  glow(ctx, 160, 700, 600, PINK, 0.22);
  glow(ctx, 940, 1500, 700, BLUE, 0.18);
  // Record grooves, faint.
  ctx.strokeStyle = "rgba(245,241,236,0.05)";
  ctx.lineWidth = 2;
  for (let r = 120; r < 1400; r += 26) {
    ctx.beginPath();
    ctx.arc(W / 2, H + 200, r, Math.PI, 2 * Math.PI);
    ctx.stroke();
  }

  ctx.textAlign = "left";
  ctx.fillStyle = PAPER;
  ctx.font = `600 52px ${DISPLAY}`;
  ctx.fillText("mixstro", 96, 200);

  ctx.fillStyle = TUNGSTEN;
  ctx.font = `600 36px ${BODY}`;
  ctx.fillText("HELP US DECIDE", 96, 420);
  const q = fit(ctx, opts.question, W - 192, 112, 64);
  ctx.fillStyle = PAPER;
  ctx.font = `600 ${q.size}px ${DISPLAY}`;
  q.lines.forEach((line, i) => ctx.fillText(line, 96, 540 + i * q.size * 1.02));

  let y = 540 + q.lines.length * q.size + 90;
  const letters = ["A", "B", "C"];
  opts.options.slice(0, 3).forEach((name, i) => {
    const f = fit(ctx, name, W - 192 - 150, 76, 44);
    const h = Math.max(190, f.lines.length * f.size * 1.08 + 90);
    ctx.fillStyle = "rgba(245,241,236,0.07)";
    roundRect(ctx, 96, y, W - 192, h, 48);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,241,236,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = [TUNGSTEN, PINK, BLUE][i]!;
    ctx.beginPath();
    ctx.arc(96 + 80, y + h / 2, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.font = `600 40px ${DISPLAY}`;
    ctx.fillText(letters[i]!, 96 + 80, y + h / 2 + 14);
    ctx.textAlign = "left";
    ctx.fillStyle = PAPER;
    ctx.font = `600 ${f.size}px ${DISPLAY}`;
    const top = y + h / 2 - ((f.lines.length - 1) * f.size * 1.08) / 2 + f.size * 0.35;
    f.lines.forEach((line, j) => ctx.fillText(line, 96 + 150, top + j * f.size * 1.08));
    y += h + 32;
  });

  ctx.fillStyle = SMOKE;
  ctx.font = `500 38px ${BODY}`;
  ctx.fillText(opts.footer ?? "Vote in one tap, no sign-up", 96, H - 250);
  ctx.fillStyle = PAPER;
  ctx.font = `600 44px ${BODY}`;
  const link = opts.link.replace(/^https?:\/\//, "");
  ctx.fillText(link.length > 40 ? link.slice(0, 39) + "…" : link, 96, H - 180);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't draw the card."))), "image/png"));
}

/** Share the card as an image where the phone allows it; otherwise hand back a URL to open or save. */
export async function shareStory(blob: Blob, title: string): Promise<"shared" | "cancelled" | string> {
  const file = new File([blob], "mixstro-band-vote.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  return URL.createObjectURL(blob);
}
