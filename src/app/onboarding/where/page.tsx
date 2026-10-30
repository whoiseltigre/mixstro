"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, Field } from "@/components/ui";
import { STEP_GLOW, stepNav, useDraft } from "@/lib/onboarding";

const nav = stepNav("where");
const GLOW = STEP_GLOW.where;

export default function Where() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string>();
  const ok = draft.neighborhood.trim().length > 1;

  function useMyLocation() {
    if (!("geolocation" in navigator)) return setNote("Location isn't available here. Type your neighborhood instead.");
    setLocating(true);
    setNote(undefined);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const place = await neighborhoodAt(coords.latitude, coords.longitude);
        setLocating(false);
        if (place) update({ neighborhood: place });
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
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={GLOW} />
      <StepTitle title="Where are you based?" sub="So musicians nearby can find you. Only your neighborhood is ever shown." />
      <div className="px-5 pt-7 flex flex-col gap-4">
        <div
          aria-hidden="true"
          className="h-[170px] rounded-[24px] bg-stage flex items-end justify-center p-3.5 overflow-hidden"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 45%, ${GLOW}88 0 18px, transparent 19px), radial-gradient(circle at 50% 45%, ${GLOW}22 0 64px, transparent 65px), repeating-linear-gradient(0deg, rgb(245 241 236 / .05) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgb(245 241 236 / .05) 0 1px, transparent 1px 28px)`,
          }}
        >
          <span className="glass rounded-full px-3.5 py-1.5 text-[14px] font-semibold max-w-full truncate">
            {draft.neighborhood.trim() || "Your neighborhood"}
          </span>
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="h-[52px] rounded-full font-semibold text-[16px] border-[1.5px] transition active:scale-[0.98] disabled:opacity-60"
          style={{ borderColor: GLOW, background: `color-mix(in srgb, ${GLOW} 18%, var(--color-stage))` }}
        >
          {locating ? "Finding you…" : "Use my location"}
        </button>
        <Field
          id="hood"
          label="Or type a neighborhood or city"
          placeholder="Echo Park, Los Angeles"
          autoComplete="address-level2"
          value={draft.neighborhood}
          onChange={(e) => update({ neighborhood: e.target.value })}
          hint={note}
        />
      </div>
      <StepFooter>
        <Button disabled={!ok} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
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
