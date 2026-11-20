"use client";

import { useState } from "react";
import { Sheet, SheetCloser } from "@/components/sheet";
import { Button } from "@/components/ui";
import { haptic, type Haptic } from "@/lib/haptics";

const CURVES = [
  { name: "spring", css: "var(--ease-spring)", ms: "var(--duration-spring)", use: "Screens, sheets, photos growing into profiles" },
  { name: "spring-snappy", css: "var(--ease-spring-snappy)", ms: "var(--duration-spring)", use: "Press release, tab pill, things you flick" },
  { name: "spring-bouncy", css: "var(--ease-spring-bouncy)", ms: "var(--duration-spring)", use: "Picks and celebrations only" },
  { name: "standard", css: "var(--ease-standard)", ms: "var(--duration-base)", use: "Things fading or rising in" },
  { name: "settle", css: "var(--ease-settle)", ms: "var(--duration-base)", use: "Moving between two places" },
  { name: "exit", css: "var(--ease-exit)", ms: "var(--duration-quick)", use: "Leaving: quick, out of the way" },
];

const DURATIONS = [
  ["instant", 90, "Press down"],
  ["quick", 160, "State changes, exits"],
  ["base", 280, "Fades, rises, list rows"],
  ["slow", 450, "Scenery: glows, progress"],
  ["spring", 520, "A spring's full settle"],
] as const;

export function MotionLab() {
  const [run, setRun] = useState<Record<string, number>>({});
  const [list, setList] = useState(0);
  const [sheet, setSheet] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col gap-2">
        {CURVES.map((c) => {
          const on = (run[c.name] ?? 0) % 2 === 1;
          return (
            <li key={c.name}>
              <button
                type="button"
                data-haptic="tap"
                onClick={() => setRun((r) => ({ ...r, [c.name]: (r[c.name] ?? 0) + 1 }))}
                className="press-card w-full text-left grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-6 items-center p-4 rounded-card bg-stage border border-paper/8 hover:border-paper/16"
              >
                <span className="flex flex-col">
                  <span className="text-callout font-semibold">ease-{c.name}</span>
                  <span className="text-caption text-smoke">{c.use}</span>
                </span>
                <span className="relative h-10 rounded-full bg-ink/60 border border-paper/8">
                  <span
                    className="absolute top-1 left-1 size-8 rounded-full bg-tungsten shadow-spotlight"
                    style={{
                      left: on ? "calc(100% - 36px)" : "4px",
                      transitionProperty: "left",
                      transitionDuration: c.ms,
                      transitionTimingFunction: c.css,
                    }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="grid sm:grid-cols-5 gap-3">
        {DURATIONS.map(([n, ms, use]) => (
          <div key={n} className="p-4 rounded-tile bg-stage border border-paper/8 flex flex-col gap-1">
            <span className="text-callout font-semibold">
              {n} <span className="text-smoke font-normal tabular-nums">{ms}ms</span>
            </span>
            <span className="text-caption text-smoke">{use}</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-callout font-semibold">Lists ease in</span>
            <button type="button" data-haptic="tap" onClick={() => setList((n) => n + 1)} className="press h-9 px-4 rounded-full glass text-footnote font-semibold">
              Replay
            </button>
          </div>
          <ul key={list} className="stagger flex flex-col gap-2">
            {["Maya Chen", "Jonah Reyes", "Eli Navarro", "Ruth Okafor", "Sam Patel"].map((n, i) => (
              <li key={n} className="flex items-center gap-3 p-3 rounded-tile bg-stage">
                <span className="size-10 rounded-full" style={{ background: `oklch(0.42 0.08 ${40 + i * 60})` }} />
                <span className="text-callout font-medium">{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-callout font-semibold">Sheets spring up, and follow your finger down</span>
          <p className="text-footnote text-smoke">Grab it mid-rise, flick it away, or press Back. It keeps the speed you let go at.</p>
          <Button variant="glass" onClick={() => setSheet(true)}>
            Open a sheet
          </Button>
        </div>
      </div>

      {sheet && (
        <Sheet onClose={() => setSheet(false)} label="Example sheet" className="bg-stage rounded-t-sheet md:rounded-sheet md:max-w-[440px] px-5 pt-7 pb-safe">
          <div className="flex flex-col gap-4 pb-2">
            <h3 className="headline text-title2">A spring sheet</h3>
            <p className="text-callout text-smoke">Drag me down, tap outside, or press Escape.</p>
            <SheetCloser>{(close) => <Button onClick={close}>Done</Button>}</SheetCloser>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function HapticRow({ kind, use }: { kind: Haptic; use: string }) {
  return (
    <li>
      <button type="button" onClick={() => haptic(kind)} className="press-card w-full h-full text-left p-4 rounded-tile bg-stage border border-paper/8 flex flex-col gap-1">
        <span className="text-callout font-semibold">{kind}</span>
        <span className="text-caption text-smoke">{use}</span>
      </button>
    </li>
  );
}
