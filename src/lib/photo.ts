"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_EDGE = 1080;

/**
 * Shrinks a picked photo to at most 1080px on its long edge as a JPEG data URL.
 * Re-drawing also drops EXIF (GPS location) and keeps the local draft small enough
 * for localStorage. createImageBitmap honours the photo's rotation.
 */
export async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Uploads a data-URL photo to avatars/<you>/<time>.jpg and returns its public URL. */
export async function uploadPhoto(supabase: SupabaseClient, userId: string, dataUrl: string): Promise<string | null> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
  if (error) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

/** Removes your older photos once a new one is saved. Best effort. */
export async function pruneOldPhotos(supabase: SupabaseClient, userId: string, keepUrl: string) {
  const { data } = await supabase.storage.from("avatars").list(userId);
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => !keepUrl.endsWith(p));
  if (old.length) await supabase.storage.from("avatars").remove(old);
}
