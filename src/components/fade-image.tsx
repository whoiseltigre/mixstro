"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cx } from "./ui";

/** A next/image that fades in over its placeholder color instead of popping in. */
export function FadeImage({ className, onLoad, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cx("transition-opacity duration-300 ease-out", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}

/** The same for a plain <img> (remote avatars and thumbnails). */
export function FadeImg({ className, onLoad, alt = "", ...props }: React.ComponentProps<"img">) {
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      ref={(el) => {
        if (el?.complete && el.naturalWidth && !loaded) setLoaded(true);
      }}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cx("transition-opacity duration-300 ease-out", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
