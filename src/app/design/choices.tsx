"use client";

import { useEffect, useState } from "react";
import { CHOICES, CHOICE_KEY } from "@/lib/design-choices";
import { cx } from "@/components/ui";

/** Try a look across the whole app in this browser. Nothing here changes what members see. */
export function DesignChoices() {
  const [picked, setPicked] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      setPicked(JSON.parse(localStorage.getItem(CHOICE_KEY) || "{}"));
    } catch {}
  }, []);

  function pick(attr: string, value: string) {
    const next = { ...picked, [attr]: value };
    if (!value) delete next[attr];
    setPicked(next);
    if (value) document.documentElement.setAttribute(attr, value);
    else document.documentElement.removeAttribute(attr);
    try {
      localStorage.setItem(CHOICE_KEY, JSON.stringify(next));
    } catch {}
  }

  function reset() {
    for (const c of CHOICES) document.documentElement.removeAttribute(c.attr);
    setPicked({});
    try {
      localStorage.removeItem(CHOICE_KEY);
    } catch {}
  }

  const changed = Object.keys(picked).length;
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid md:grid-cols-2 gap-3">
        {CHOICES.map((c) => (
          <li key={c.id} className="rounded-card bg-stage border border-paper/12 p-4 flex flex-col gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-body font-semibold">{c.label}</span>
              <span className="text-footnote text-smoke">{c.why}</span>
            </span>
            <div role="radiogroup" aria-label={c.label} className="flex flex-wrap gap-2">
              {c.options.map((o) => {
                const on = (picked[c.attr] ?? "") === o.value;
                return (
                  <button
                    key={o.value || "default"}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-haptic="select"
                    onClick={() => pick(c.attr, o.value)}
                    className={cx("press h-11 px-4 rounded-full text-callout border", on ? "bg-paper text-ink border-paper font-semibold" : "border-paper/25 text-paper")}
                  >
                    {o.label}
                    {o.value === "" && <span className={cx("ml-1.5 text-caption", on ? "text-ink/60" : "text-smoke")}>default</span>}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-footnote text-smoke max-w-[520px]">
          Picks apply across the app in this browser only, so you can walk through real screens with them. Tell Claude which ones to keep and they become the default for everyone.
        </p>
        <button type="button" onClick={reset} disabled={!changed} className="press h-11 px-5 rounded-full glass text-callout font-medium disabled:opacity-40">
          Back to defaults{changed ? ` (${changed} changed)` : ""}
        </button>
      </div>
    </div>
  );
}
