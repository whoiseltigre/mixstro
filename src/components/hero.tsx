"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { backWithHero, openWithHero, readHandoff } from "@/lib/view-transition";
import { haptic } from "@/lib/haptics";
import { BackButton } from "./ui";

/**
 * A link whose photo grows into the screen it opens (see lib/view-transition.ts).
 * `heroKey` names the person or band; the destination marks its photo with the same key.
 * Put `data-hero-source` on the element that frames the photo, or the whole link morphs.
 */
export function HeroLink({ heroKey, tint, href, onClick, ...props }: ComponentProps<typeof Link> & { heroKey: string; tint?: string; href: string }) {
  const router = useRouter();
  return (
    <Link
      {...props}
      href={href}
      data-hero-card={heroKey}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        haptic("tap");
        const source = (e.currentTarget.querySelector("[data-hero-source]") as HTMLElement | null) ?? e.currentTarget;
        openWithHero(router, href, source, { key: heroKey, tint });
      }}
    />
  );
}

/**
 * Under a hero photo on the destination: the image the card was already showing, so the
 * morph lands on a photo (not an empty box) while the full-size one loads over it.
 */
export function HeroUnderlay({ heroKey }: { heroKey: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => setSrc(readHandoff(heroKey)?.src ?? null), [heroKey]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover object-[50%_40%]" />;
}

/** The profile skeleton's photo: the handed-over image if we have one, the bone otherwise. */
export function HeroSkeletonPhoto({ className }: { className?: string }) {
  const [hand, setHand] = useState<{ key: string; src?: string; tint?: string } | null>(null);
  useEffect(() => {
    const key = decodeURIComponent(location.pathname.split("/")[2] ?? "");
    const h = readHandoff(key);
    if (h) setHand(h);
  }, []);
  return (
    <div data-hero={hand?.key} className={className} style={hand?.tint ? { background: hand.tint } : undefined}>
      {hand?.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hand.src} alt="" aria-hidden="true" className="size-full object-cover object-[50%_40%]" />
      )}
    </div>
  );
}

/** Back that shrinks the hero photo into the card it came from. */
export function HeroBackButton({ heroKey, href }: { heroKey: string; href: string }) {
  const router = useRouter();
  return <BackButton onClick={() => backWithHero(router, heroKey, href)} />;
}
