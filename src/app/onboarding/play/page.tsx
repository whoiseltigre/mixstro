"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, CheckIcon, Chip, Field, SectionLabel, cx } from "@/components/ui";
import { GOALS, INSTRUMENTS, stepNav, toggle, useDraft } from "@/lib/onboarding";

const nav = stepNav("play");

export default function Play() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const [geoNote, setGeoNote] = useState<string>();

  function tapInstrument(name: string) {
    const on = draft.instruments.includes(name);
    // First tap selects, second tap makes it your main, third tap removes.
    if (on && draft.mainInstrument !== name) return update({ mainInstrument: name });
    const instruments = toggle(draft.instruments, name);
    update({
      instruments,
      mainInstrument: on ? (draft.mainInstrument === name ? instruments[0] : draft.mainInstrument) : (draft.mainInstrument ?? name),
    });
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) return setGeoNote("Location isn't available here. Type your neighborhood instead.");
    navigator.geolocation.getCurrentPosition(
      // TODO: reverse-geocode to a neighborhood server-side and store a coarse point only.
      () => setGeoNote("Got it. We'll only ever show your neighborhood."),
      () => setGeoNote("No problem. Type your neighborhood instead."),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const ok = draft.instruments.length > 0 && draft.goals.length > 0 && draft.neighborhood.trim().length > 1;

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} />
      <StepTitle title="Your music" sub="What you play, what you're here for, and roughly where." />
      <div className="px-5 pt-7 flex flex-col gap-8">
        <div className="flex flex-col gap-2.5">
          <SectionLabel>What do you play? Tap twice for your main one.</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((name) => (
              <Chip key={name} selected={draft.instruments.includes(name)} onClick={() => tapInstrument(name)}>
                {name}
                {draft.mainInstrument === name && <span className="ml-1 text-[11px] font-bold text-ink/60">MAIN</span>}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <SectionLabel>What brings you here? Pick any.</SectionLabel>
          <div className="flex flex-col gap-2">
            {GOALS.map((g) => {
              const on = draft.goals.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ goals: toggle(draft.goals, g.id) })}
                  className={cx(
                    "flex items-center gap-3 px-4 py-3.5 rounded-[18px] bg-stage text-left border transition hover:border-paper/40",
                    on ? "border-paper/70" : "border-paper/8",
                  )}
                >
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[16px] font-semibold">{g.title}</span>
                    <span className="text-[13px] text-smoke">{g.sub}</span>
                  </span>
                  <span className={cx("size-6 rounded-full flex items-center justify-center shrink-0", on ? "bg-paper text-ink" : "border-[1.5px] border-paper/25")}>
                    {on && <CheckIcon size={13} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Field
            id="hood"
            label="Neighborhood or city"
            placeholder="Echo Park, Los Angeles"
            autoComplete="address-level2"
            value={draft.neighborhood}
            onChange={(e) => update({ neighborhood: e.target.value })}
            hint={geoNote ?? "Only your neighborhood is ever shown."}
          />
          <button type="button" onClick={useMyLocation} className="self-start text-[14px] font-semibold text-paper underline underline-offset-2">
            Use my current location
          </button>
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
