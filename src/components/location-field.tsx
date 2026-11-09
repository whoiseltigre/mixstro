"use client";

import { useState } from "react";
import { Field } from "@/components/ui";
import { STEP_GLOW, type Draft } from "@/lib/onboarding";

const GLOW = STEP_GLOW.where;

/** "Use my location" or a typed neighborhood. Others only see the neighborhood and how far away you are. */
export function LocationField({ draft, update }: { draft: Draft; update: (patch: Partial<Draft>) => void }) {
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string>();

  function useMyLocation() {
    if (!("geolocation" in navigator)) return setNote("Location isn't available here. Type your neighborhood instead.");
    setLocating(true);
    setNote(undefined);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const place = await neighborhoodAt(coords.latitude, coords.longitude);
        setLocating(false);
        if (place) update({ neighborhood: place, point: { lat: Math.round(coords.latitude * 100) / 100, lng: Math.round(coords.longitude * 100) / 100 } });
        else setNote("We couldn't name that spot. Type your neighborhood instead.");
      },
      () => {
        setLocating(false);
        setNote("No problem. Type your neighborhood instead.");
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Field
        id="hood"
        label="Where you're based"
        placeholder="Echo Park, Los Angeles"
        autoComplete="address-level2"
        value={draft.neighborhood}
        onChange={(e) => update({ neighborhood: e.target.value, point: undefined })}
        hint={note ?? "Others only see your neighborhood and how many miles away you are."}
      />
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="self-start h-10 px-4 rounded-full font-semibold text-[14px] border-[1.5px] inline-flex items-center gap-2 transition active:scale-[0.98] disabled:opacity-60"
        style={{ borderColor: GLOW, background: `color-mix(in srgb, ${GLOW} 18%, var(--color-stage))` }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
        {locating ? "Finding you…" : "Use my location"}
      </button>
    </div>
  );
}

/** Turns a point into "Neighborhood, City" with BigDataCloud's free client-side lookup. Only the name is kept, never the point. */
async function neighborhoodAt(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&localityLanguage=en`,
    );
    if (!res.ok) return undefined;
    const d: { locality?: string; city?: string; principalSubdivision?: string } = await res.json();
    const parts = [d.locality, d.city && d.city !== d.locality ? d.city : d.principalSubdivision].filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  } catch {
    return undefined;
  }
}
