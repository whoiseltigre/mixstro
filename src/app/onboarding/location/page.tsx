"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, Field, SectionLabel, cx } from "@/components/ui";
import { DAYS, stepNav, toggle, useDraft } from "@/lib/onboarding";

const nav = stepNav("location");

export default function Location() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const [locating, setLocating] = useState(false);
  const [geoNote, setGeoNote] = useState<string>();

  function useMyLocation() {
    if (!("geolocation" in navigator)) return setGeoNote("Location isn't available on this device. Type your neighborhood instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        // TODO: reverse-geocode to a neighborhood server-side and store a coarse point only.
        setLocating(false);
        setGeoNote("Got it. We'll only ever show your neighborhood.");
      },
      () => {
        setLocating(false);
        setGeoNote("No problem. Type your neighborhood instead.");
      },
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const ok = draft.neighborhood.trim().length > 1 && draft.playDays.length > 0;

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} />
      <StepTitle title="Where and when?" sub="Matches are local first. We only ever show your neighborhood, never your exact location." />
      <div className="px-5 pt-7 flex flex-col gap-7">
        <div className="flex flex-col gap-2.5">
          <Field
            id="hood"
            label="Neighborhood or city"
            placeholder="Echo Park, Los Angeles"
            autoComplete="address-level2"
            value={draft.neighborhood}
            onChange={(e) => update({ neighborhood: e.target.value })}
          />
          <button type="button" onClick={useMyLocation} disabled={locating} className="self-start text-[14px] font-semibold text-paper underline underline-offset-2">
            {locating ? "Finding you…" : "Use my current location"}
          </button>
          {geoNote && <p className="text-[12px] text-smoke">{geoNote}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between">
            <SectionLabel>Distance</SectionLabel>
            <span className="text-[13px] text-smoke tabular-nums">Within {draft.radiusMi} mi</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={draft.radiusMi}
            onChange={(e) => update({ radiusMi: Number(e.target.value) })}
            aria-label="Distance in miles"
            className="w-full accent-paper"
          />
        </div>

        <div className="flex flex-col gap-3">
          <SectionLabel>Days you can usually play</SectionLabel>
          <div className="flex gap-1.5">
            {DAYS.map((d) => {
              const on = draft.playDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={d}
                  onClick={() => update({ playDays: toggle(draft.playDays, d) })}
                  className={cx("flex-1 h-11 rounded-xl text-[13px] font-semibold transition", on ? "bg-paper text-ink" : "bg-stage text-smoke")}
                >
                  {d.slice(0, d === "Thu" || d === "Tue" || d === "Sat" || d === "Sun" ? 2 : 1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <StepFooter>
        <Button disabled={!ok} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}
