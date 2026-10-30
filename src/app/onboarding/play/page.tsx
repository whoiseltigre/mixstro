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

  // A tap only adds or removes. Your first pick is your main until you choose another below.
  function tapInstrument(name: string) {
    const instruments = toggle(draft.instruments, name);
    const main = draft.mainInstrument && instruments.includes(draft.mainInstrument) ? draft.mainInstrument : instruments[0];
    update({ instruments, mainInstrument: main });
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
          <SectionLabel>What do you play? Pick all that apply.</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((name) => (
              <Chip key={name} selected={draft.instruments.includes(name)} onClick={() => tapInstrument(name)}>
                {name}
              </Chip>
            ))}
          </div>
          {draft.instruments.length > 1 && (
            <div className="mt-3 flex flex-col gap-2.5" role="radiogroup" aria-label="Your main instrument">
              <SectionLabel>Which one is your main?</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {draft.instruments.map((name) => {
                  const on = draft.mainInstrument === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => update({ mainInstrument: name })}
                      className={cx(
                        "h-9 px-3.5 rounded-full text-[14px] inline-flex items-center gap-1.5 border transition active:scale-[0.97]",
                        on ? "bg-tungsten text-ink border-tungsten font-semibold" : "border-paper/16 text-paper",
                      )}
                    >
                      {on && <StarIcon />}
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}
