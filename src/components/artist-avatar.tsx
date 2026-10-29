import type { Artist } from "@/lib/onboarding";
import { artistTint, initials } from "@/lib/artists";

export function ArtistAvatar({ artist, size = 88 }: { artist: Artist; size?: number }) {
  if (artist.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={artist.image} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="rounded-full flex items-center justify-center font-display font-bold text-paper/90"
      style={{ width: size, height: size, background: artistTint(artist.id), fontSize: size * 0.3 }}
    >
      {initials(artist.name)}
    </span>
  );
}
