"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { generateNames } from "@/lib/band-names/generate.ts";
import { checkAvailability, type Availability } from "@/lib/band-names/availability.ts";
import { genres, moods, type Genre } from "@/lib/band-names/wordlists.ts";
import { api, recentVotes, shareText, startBandUrl, track, type RecentVote } from "@/lib/band-names/client";
import { shareStory, storyCard } from "@/lib/band-names/story-card";

const GENRES = Object.keys(genres) as Genre[];
const VIBES = [...moods.keys()];
const LABEL: Record<string, string> = { "hip-hop": "Hip-hop", electronic: "Electronic" };
const label = (s: string) => LABEL[s] ?? s[0]!.toUpperCase() + s.slice(1);

const STORE = "mixstro-band-names-v1";
const MAX = 3;

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

/** `genre` set: a genre page (/band-name-generator/metal). Its genre wins over the one saved in this browser. */
export function Generator({ initial, genre }: { initial: string[]; genre?: Genre }) {
  const router = useRouter();
  const [names, setNames] = useState(initial);
  const [options, setOptions] = useState<Options>({ ...DEFAULTS, genre: genre ?? "" });
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [story, setStory] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RecentVote[]>([]);
  const [ready, setReady] = useState(false);

  // Bring back the last batch and shortlist from this browser.
  useEffect(() => {
    const saved = load();
    if (saved) {
      setShortlist(saved.shortlist);
      if (!genre || saved.options.genre === genre) {
        if (saved.names.length) setNames(saved.names);
        setOptions(saved.options);
      } else {
        setOptions({ ...saved.options, genre });
      }
    }
    setRecent(recentVotes());
    setReady(true);
  }, [genre]);

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
          exclude: names,
        }),
      );
      setError("");
      track("bng_generate");
    } catch (err) {
      setError(err instanceof RangeError ? err.message : "Something went wrong. Try again.");
    }
  }

  function toggle(name: string) {
    setNote("");
    setStory(undefined);
    setShortlist((s) => {
      if (s.includes(name)) return s.filter((n) => n !== name);
      if (s.length >= MAX) return s;
      track("bng_shortlist");
      return [...s, name];
    });
  }

  async function check(name: string) {
    setChecks((c) => ({ ...c, [name]: "checking" }));
    track("bng_check");
    const result = await checkAvailability(name);
    setChecks((c) => ({ ...c, [name]: result }));
  }

  async function startVote() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ id: string; url: string }>({ action: "create", options: shortlist });
      router.push(r.url);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function share() {
    track("bng_share");
    const r = await shareText("Pick our band name", `Help us pick a band name: ${shortlist.join(", ")}. Which one?`, `${location.origin}/band-name-generator`);
    if (r === "copied") setNote("Copied. Paste it in the band chat.");
    else if (r !== "shared") setNote(r);
  }

  async function makeStory() {
    setNote("");
    try {
      const blob = await storyCard({ question: "Pick our band name", options: shortlist, link: `${location.host}/band-name-generator`, footer: "Reply with A, B or C. Names from" });
      track("bng_story");
      const r = await shareStory(blob, "Pick our band name");
      if (r !== "shared" && r !== "cancelled") setStory(r);
    } catch {
      setNote("Couldn't make the image on this browser.");
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
          <span>Stylized (lowercase or ALL CAPS)</span>
        </label>
        <button className="mxb-btn paper bng-go" type="submit">Get 12 names</button>
        {error && !shortlist.length && <p className="bng-error" role="alert">{error}</p>}
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
                  <a className="bng-start" href={startBandUrl(name)} onClick={() => track("bng_signup_click")}>
                    Start {name} on Mixstro <span aria-hidden="true">→</span>
                  </a>
                </li>
              );
            })}
          </ol>
          <div className="bng-cta">
            {full ? (
              <button type="button" className="mxb-btn paper sm" disabled={busy} onClick={startVote}>
                {busy ? "Starting the vote…" : "Let the band vote"}
              </button>
            ) : (
              <button type="button" className="mxb-btn paper sm" onClick={share}>Ask the band</button>
            )}
            {full && (
              <button type="button" className="mxb-btn ghost sm" onClick={makeStory}>Make a story image</button>
            )}
          </div>
          {full && <p className="bng-small">The vote gets its own link. Anyone with it can vote in one tap, no sign-up.</p>}
          {!full && <p className="bng-small">Shortlist three to start a band vote.</p>}
          {error && <p className="bng-error" role="alert">{error}</p>}
          {note && <p className="bng-note" aria-live="polite">{note}</p>}
          {story && (
            <p className="bng-note">
              <a className="bng-link" href={story} target="_blank" rel="noopener">Open the story image</a> and save it to your photos.
            </p>
          )}
          <p className="bng-small">The check searches MusicBrainz and Apple Music for real artists. It isn&apos;t a trademark search.</p>
        </section>
      )}

      {recent.length > 0 && (
        <section className="bng-recent" aria-labelledby="bng-recent">
          <h2 id="bng-recent">Your band votes</h2>
          <ul>
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/band-name-generator/vote/${r.id}`}>{r.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
