#!/usr/bin/env python3
"""
Blog photo pipeline. Run it after editing scripts/blog-images.json:

    python3 scripts/blog_images.py <folder with the source photos>

For every entry it:
  * gives the photo the House Lights grade (warm Ink shadows, Paper highlights, a touch of Tungsten),
  * crops covers to 16:9 and in-post photos to 3:2, focused on `focus` (x, y from 0 to 1),
  * writes WebP at 640/1080/1600 px wide to public/site/v1/blog/<slug>/<name>-<hash>-<w>.webp,
  * draws a 1200x630 share card per post (og-<hash>.jpg) with the title and the Mixstro lockup,
  * writes cover, cover_alt, cover_credit, cover_credit_url and og into the post's frontmatter.

Filenames carry a content hash, so /site/v1 can stay cached forever. In-post photos are placed by
hand in the Markdown: ![alt](/site/v1/blog/<slug>/<name>-<hash> "Photo: Name|https://unsplash.com/@name").
The script prints that line for each one.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "site" / "v1" / "blog"
POSTS = ROOT / "content" / "blog"
MANIFEST = ROOT / "scripts" / "blog-images.json"
LOCKUP = ROOT / "scripts" / "assets" / "mixstro-lockup-paper-128h.png"
FONT = str(ROOT / "scripts" / "assets" / "InterDisplay-SemiBold.otf")
WIDTHS = (640, 1080, 1600)

INK = np.array([15, 13, 11], dtype=np.float32)
TUNGSTEN = np.array([255, 178, 69], dtype=np.float32)
PAPER = np.array([245, 241, 236], dtype=np.float32)


def grade(img: Image.Image) -> Image.Image:
    """House Lights: pull every photo into one warm family without flattening it.

    Colors are partly desaturated, then tinted: amber in the shadows and mids (Tungsten),
    a warm Paper cast in the highlights. Blacks sit on Ink instead of pure black.
    """
    a = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    lum = (a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None]
    desat = lum + (a - lum) * 0.7
    shadow_tint = np.array([1.16, 0.97, 0.78], dtype=np.float32)  # toward Tungsten
    high_tint = np.array([1.03, 1.0, 0.95], dtype=np.float32)  # toward Paper
    t = np.clip(lum * 1.4 - 0.2, 0, 1)
    tint = shadow_tint * (1 - t) + high_tint * t
    out = desat * tint
    # slight S-curve so the photo keeps its punch
    out = np.clip(out, 0, 1)
    out = out + (out * out * (3 - 2 * out) - out) * 0.35
    out = INK / 255 + out * (1 - INK / 255)
    return Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8))


def crop(img: Image.Image, ratio: float, focus=(0.5, 0.5)) -> Image.Image:
    w, h = img.size
    if w / h > ratio:
        nw, nh = int(h * ratio), h
    else:
        nw, nh = w, int(w / ratio)
    fx, fy = focus
    left = min(max(int(fx * w - nw / 2), 0), w - nw)
    top = min(max(int(fy * h - nh / 2), 0), h - nh)
    return img.crop((left, top, left + nw, top + nh))


def short_hash(img: Image.Image) -> str:
    return hashlib.sha1(img.tobytes()[:2_000_000] + str(img.size).encode()).hexdigest()[:8]


def write_webps(img: Image.Image, slug: str, name: str) -> str:
    h = short_hash(img)
    d = OUT / slug
    d.mkdir(parents=True, exist_ok=True)
    for old in d.glob(f"{name}-*.webp"):
        old.unlink()
    for w in WIDTHS:
        r = img.resize((w, round(w * img.height / img.width)), Image.LANCZOS)
        r.save(d / f"{name}-{h}-{w}.webp", "WEBP", quality=74 if w > 1000 else 78, method=6)
    return f"/site/v1/blog/{slug}/{name}-{h}"


def wrap(draw, text, font, width):
    words, lines, line = text.split(), [], ""
    for w in words:
        test = f"{line} {w}".strip()
        if draw.textlength(test, font=font) <= width:
            line = test
        else:
            lines.append(line)
            line = w
    lines.append(line)
    return lines


def og_card(photo: Image.Image, title: str, cat: str, slug: str) -> str:
    W, H = 1200, 630
    base = crop(photo, W / H).resize((W, H), Image.LANCZOS).convert("RGBA")
    # Ink fade from the left and bottom so the title always reads
    grad = np.zeros((H, W, 4), dtype=np.float32)
    x = np.linspace(0, 1, W)[None, :]
    y = np.linspace(0, 1, H)[:, None]
    alpha = np.clip(np.maximum(1.05 - x * 1.5, (y - 0.35) * 1.3), 0, 0.94)
    grad[..., :3] = INK
    grad[..., 3] = alpha * 255
    base = Image.alpha_composite(base, Image.fromarray(grad.astype(np.uint8), "RGBA"))
    draw = ImageDraw.Draw(base)
    font = ImageFont.truetype(FONT, 66)
    lines = wrap(draw, title, font, 760)
    while len(lines) > 3:
        font = ImageFont.truetype(FONT, font.size - 6)
        lines = wrap(draw, title, font, 760)
    lh = int(font.size * 1.06)
    y0 = H - 92 - lh * len(lines)
    small = ImageFont.truetype(FONT, 26)
    draw.text((72, y0 - 52), cat, font=small, fill=tuple(TUNGSTEN.astype(int)))
    for i, ln in enumerate(lines):
        draw.text((72, y0 + i * lh), ln, font=font, fill=tuple(PAPER.astype(int)))
    logo = Image.open(LOCKUP).convert("RGBA")
    logo = logo.resize((round(logo.width * 40 / logo.height), 40), Image.LANCZOS)
    base.alpha_composite(logo, (72, 56))
    out = base.convert("RGB")
    h = hashlib.sha1(out.tobytes()).hexdigest()[:8]
    d = OUT / slug
    for old in d.glob("og-*.jpg"):
        old.unlink()
    out.save(d / f"og-{h}.jpg", "JPEG", quality=84, optimize=True, progressive=True)
    return f"/site/v1/blog/{slug}/og-{h}.jpg"


def set_fields(slug: str, fields: dict):
    p = POSTS / f"{slug}.md"
    raw = p.read_text()
    m = re.match(r"^---\n([\s\S]*?)\n---\n", raw)
    fm = m.group(1).split("\n")
    for key, val in fields.items():
        line = f'{key}: "{val}"' if val else f"{key}:"
        idx = next((i for i, l in enumerate(fm) if re.match(rf"^{key}:", l)), None)
        if idx is None:
            # keep image fields together, right after cover_alt (or at the end)
            after = next((i for i, l in enumerate(fm) if l.startswith("cover_alt:")), len(fm) - 1)
            fm.insert(after + 1, line)
        else:
            fm[idx] = line
    p.write_text("---\n" + "\n".join(fm) + "\n---\n" + raw[m.end():])


def place_inline(slug: str, photos):
    """Puts each photo after the first paragraph under the H2 that starts with its `section`."""
    p = POSTS / f"{slug}.md"
    text = p.read_text()
    # drop photos from an earlier run
    text = re.sub(rf"\n!\[[^\]]*\]\(/site/v1/blog/{re.escape(slug)}/photo-[^)]*\)\n", "", text)
    for section, line in photos:
        m = re.search(rf"^## {re.escape(section)}.*$", text, re.M)
        if not m:
            raise SystemExit(f"{slug}: no H2 starting with {section!r}")
        # end of the first paragraph after the heading
        para = re.search(r"\n\n[^\n#][\s\S]*?\n\n", text[m.end():])
        at = m.end() + (para.end() if para else 0)
        text = text[:at] + line + "\n\n" + text[at:]
    p.write_text(text)


def title_and_cat(slug: str):
    raw = (POSTS / f"{slug}.md").read_text()
    title = re.search(r'^title:\s*"?(.*?)"?\s*$', raw, re.M).group(1)
    tags = re.search(r"^tags:\s*\[(.*?)\]", raw, re.M).group(1)
    return title.replace('\\"', '"'), tags.split(",")[0].strip()


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT
    manifest = json.loads(MANIFEST.read_text())
    for slug, entry in manifest.items():
        cover = entry["cover"]
        photo = grade(Image.open(src / cover["file"]))
        base = write_webps(crop(photo, 16 / 9, cover.get("focus", (0.5, 0.5))), slug, "cover")
        title, cat = title_and_cat(slug)
        og = og_card(photo, title, cat, slug)
        set_fields(slug, {
            "cover": base,
            "cover_alt": cover["alt"].replace('"', "'"),
            "cover_credit": cover["credit"],
            "cover_credit_url": cover["credit_url"],
            "og": og,
        })
        print(f"{slug}: cover {base}")
        lines = []
        for i, inl in enumerate(entry.get("inline", []), 1):
            ph = grade(Image.open(src / inl["file"]))
            b = write_webps(crop(ph, 3 / 2, inl.get("focus", (0.5, 0.5))), slug, f"photo-{i}")
            lines.append((inl["section"], f'![{inl["alt"]}]({b} "Photo: {inl["credit"]}|{inl["credit_url"]}")'))
        place_inline(slug, lines)


if __name__ == "__main__":
    main()
