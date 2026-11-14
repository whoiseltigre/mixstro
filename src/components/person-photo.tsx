import { artistTint, initials } from "@/lib/artists";
import { FadeImage } from "@/components/fade-image";
import { cx } from "@/components/ui";
import type { Musician } from "@/lib/mock";

/** A musician's photo filling its (relative) parent, or a tinted initials panel when they haven't added one. */
export function PersonPhoto({
  person,
  sizes,
  priority,
  className,
  initialsSize = 32,
}: {
  person: Pick<Musician, "id" | "name" | "photo" | "photoAlt">;
  sizes: string;
  priority?: boolean;
  className?: string;
  initialsSize?: number;
}) {
  if (person.photo) {
    // Their own color sits underneath while the photo loads, then the photo fades in over it.
    return (
      <>
        <span aria-hidden="true" className="absolute inset-0" style={{ background: artistTint(person.id) }} />
        <FadeImage src={person.photo} alt={person.photoAlt} fill priority={priority} sizes={sizes} className={cx("object-cover", className)} />
      </>
    );
  }
  return (
    <span
      role="img"
      aria-label={person.photoAlt}
      className="absolute inset-0 flex items-center justify-center font-display font-bold text-paper/85"
      style={{ background: artistTint(person.id), fontSize: initialsSize }}
    >
      {initials(person.name)}
    </span>
  );
}
