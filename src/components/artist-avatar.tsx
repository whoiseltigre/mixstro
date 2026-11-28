"use client";

import { useState } from "react";
import type { Artist } from "@/lib/onboarding";
import { artistTint, initials } from "@/lib/artists";

/** An artist's photo in a circle. With no photo, or one that fails to load, their initials on their own tint. */
export function ArtistAvatar({ artist, size = 88 }: { artist: Artist; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (artist.image && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={artist.image} alt="" width={size} height={size} onError={() => setFailed(true)} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="rounded-full flex items-center justify-center font-display font-semibold text-paper/90 shrink-0"
      style={{ width: size, height: size, background: artistTint(artist.id), fontSize: size * 0.3 }}
    >
      {initials(artist.name)}
    </span>
  );
}
