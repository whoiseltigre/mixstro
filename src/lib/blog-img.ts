/**
 * Blog photos are pre-sized by scripts/blog_images.py into /site/v1/blog/<slug>/<name>-<hash>-<w>.webp.
 * A post stores only the base path (without -<w>.webp); these helpers build the srcset from it.
 */
export const IMG_WIDTHS = [640, 1080, 1600] as const;

export const isBlogImage = (src: string) => src.startsWith("/site/v1/blog/");

export function srcSet(base: string) {
  return IMG_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(", ");
}

export function imgSrc(base: string, w: (typeof IMG_WIDTHS)[number] = 1080) {
  return `${base}-${w}.webp`;
}

/** Props for a plain <img> of a blog photo. Covers are 16:9; in-post photos are 3:2. */
export function photoProps(base: string, sizes: string, ratio: "16:9" | "3:2" = "16:9") {
  const [rw, rh] = ratio === "16:9" ? [16, 9] : [3, 2];
  return { src: imgSrc(base), srcSet: srcSet(base), sizes, width: 1600, height: Math.round((1600 * rh) / rw) };
}
