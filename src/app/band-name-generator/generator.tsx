"use client";

import { useEffect, useState } from "react";
import { generateNames } from "@/lib/band-names/generate.ts";
import { checkAvailability, type Availability } from "@/lib/band-names/availability.ts";
import { genres, moods, type Genre } from "@/lib/band-names/wordlists.ts";

const GENRES = Object.keys(genres) as Genre[];
const VIBES = [...moods.keys()];
const LABEL: Record<string, string> = { "hip-hop": "Hip-hop", electronic: "Electronic" };
const label = (s: string) => LABEL[s] ?? s[0]!.toUpperCase() + s.slice(1);

const STORE = "mixstro-band-names-v1";
const MAX = 3;
const SIGNUP = "https://app.mixstro.com/?utm_source=band-name-generator&utm_medium=tool&utm_campaign=shortlist";

type Options = { genre: Genre | ""; vibe: string; keyword: string; mode: "include" | "inspire"; stylize: boolean };
type Saved = { names: string[]; options: Options; shortlist: string[] };
type Check = Availability | "checking";

const DEFAULTS: Options = { genre: "", vibe: "", keyword: "", mode: "include", stylize: false };

function load(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (!v || !Array.isArray(v.names) || !Array.isArray(v.shortlist)) return null;
    const strings = (a: unknown[]) => a.filter((s): s is string => typeof s === "string" && s.length <= 96);
    return { names: strings(v.names).slice(0, 12), shortlist: strings(v.shortlist).slice(0, MAX), options: { ...DEFAULTS, ...(v.options ?? {}) } };
  } catch {
    return null;
  }
}

function verdict(c: Check | undefined): { text: string; tone: string } | null {
  if (!c) return null;
  if (c === "checking") return { text: "Checking real artists…", tone: "wait" };
  const who = c.matches.slice(0, 3).join(", ");
  switch (c.status) {
    case "available":
      return { text: "No artist found by that name. Looks free.", tone: "ok" };
    case "similar":
      return { text: `Close to an existing artist${who ? `: ${who}` : ""}.`, tone: "warn" };
    case "taken":
      return { text: `Already a band${who ? `: ${who}` : ""}.`, tone: "no" };
    default:
      return { text: "Couldn't check right now. Try again in a moment.", tone: "wait" };
  }
}

export function Generator({ initial }: { initial: string[] }) {
  const [names, setNames] = useState(initial);
  const [options, setOptions] = useState<Options>(DEFAULTS);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);

  // Bring back the last batch and shortlist from this browser.
  useEffect(() => {
    const saved = load();
    if (saved) {
      if (saved.names.length) setNames(saved.names);
      setOptions(saved.options);
      setShortlist(saved.shortlist);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ names, options, shortlist }));
    } catch {
      // Private mode: the page still works, it just won't remember.
    }
  }, [names, options, shortlist, ready]);

  function set<K extends keyof Options>(key: K, value: Options[K]) {
    setOptions((o) => ({ ...o, [key]: value }));
  }

  function generate(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      setNames(
        generateNames({
          genre: options.genre || undefined,
          vibe: options.vibe ? [options.vibe] : [],
          keyword: options.keyword,
          keywordMode: options.mode,
          stylize: options.stylize,
        }),
      );
      setError("");
    } catch (err) {
      setError(err instanceof RangeError ? err.message : "Something went wrong. Try again.");
    }
  }

  function toggle(name: string) {
    setNote("");
    setShortlist((s) => (s.includes(name) ? s.filter((n) => n !== name) : s.length < MAX ? [...s, name] : s));
  }

  async function check(name: string) {
    setChecks((c) => ({ ...c, [name]: "checking" }));
    const result = await checkAvailability(name);
    setChecks((c) => ({ ...c, [name]: result }));
  }

  async function share() {
    const url = `${location.origin}/band-name-generator`;
    const text = `Help us pick a band name: ${shortlist.join(", ")}. Which one?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pick our band name", text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote("Copied. Paste it in the band chat.");
    } catch {
      setNote(`${text} ${url}`);
    }
  }

  const full = shortlist.length >= MAX;

  return (
    <div className="bng">
      <form className="bng-panel bng-controls" onSubmit={generate}>
        <label className="bng-field">
          <span>Genre</span>
          <select id="bng-genre" value={options.genre} onChange={(e) => set("genre", e.target.value as Genre | "")}>
            <option value="">Any genre</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{label(g)}</option>
            ))}
          </select>
        </label>
        <label className="bng-field">
          <span>Vibe</span>
          <select id="bng-vibe" value={options.vibe} onChange={(e) => set("vibe", e.target.value)}>
            <option value="">Any vibe</option>
            {VIBES.map((v) => (
              <option key={v} value={v}>{label(v)}</option>
            ))}
          </select>
        </label>
        <label className="bng-field bng-word">
          <span>A word you like (optional)</span>
          <input id="bng-keyword" value={options.keyword} maxLength={48} placeholder="river, garage, night…" onChange={(e) => set("keyword", e.target.value)} />
        </label>
        <fieldset className="bng-seg" aria-label="How to use your word">
          <button type="button" aria-pressed={options.mode === "include"} onClick={() => set("mode", "include")}>Put it in the name</button>
          <button type="button" aria-pressed={options.mode === "inspire"} onClick={() => set("mode", "inspire")}>Just set the mood</button>
        </fieldset>
        <label className="bng-check">
          <input id="bng-stylize" type="checkbox" checked={options.stylize} onChange={(e) => set("stylize", e.target.checked)} />
          <span>Stylized spelling (CHRMS, VELVT)</span>
        </label>
        <button className="mxb-btn paper bng-go" type="submit">Get 12 names</button>
        {error && <p className="bng-error" role="alert">{error}</p>}
      </form>

      <section className="bng-results" aria-label="Name ideas">
        <p className="bng-hint" aria-live="polite">
          {full ? "Three picked. Remove one below to swap it." : shortlist.length ? `${shortlist.length} of ${MAX} shortlisted.` : "Tap a name to shortlist it. Pick up to three."}
        </p>
        <ul className="bng-grid">
          {names.map((name) => {
            const on = shortlist.includes(name);
            return (
              <li key={name}>
                <button type="button" className="bng-name" aria-pressed={on} disabled={full && !on} onClick={() => toggle(name)}>
                  <span>{name}</span>
                  <b aria-hidden="true">{on ? "✓" : "+"}</b>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {shortlist.length > 0 && (
        <section className="bng-panel bng-short" aria-label="Your shortlist">
          <h2>Your shortlist</h2>
          <ol>
            {shortlist.map((name) => {
              const v = verdict(checks[name]);
              return (
                <li key={name}>
                  <div className="bng-row">
                    <strong>{name}</strong>
                    <span className="bng-actions">
                      <button type="button" className="bng-link" disabled={checks[name] === "checking"} onClick={() => check(name)}>
                        {checks[name] && checks[name] !== "checking" ? "Check again" : "Is it taken?"}
                      </button>
                      <button type="button" className="bng-link quiet" onClick={() => toggle(name)} aria-label={`Remove ${name}`}>Remove</button>
                    </span>
                  </div>
                  {v && <p className={`bng-verdict ${v.tone}`}>{v.text}</p>}
                </li>
              );
            })}
          </ol>
          <div className="bng-cta">
            <button type="button" className="mxb-btn paper sm" onClick={share}>Ask the band</button>
            <a className="mxb-btn ghost sm" href={SIGNUP}>Claim your free profile on Mixstro</a>
          </div>
          {note && <p className="bng-note" aria-live="polite">{note}</p>}
          <p className="bng-small">The check searches MusicBrainz for real artists. It isn&apos;t a trademark search.</p>
        </section>
      )}
    </div>
  );
}
