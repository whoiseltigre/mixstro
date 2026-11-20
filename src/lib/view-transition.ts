"use client";

/**
 * Shared-element ("hero") transitions between screens, on the browser's View Transitions API.
 *
 * Tapping a musician's photo grows that photo into the profile it opens, and Back shrinks it
 * home again. How: the tapped photo is named `hero` for the "before" snapshot, the next screen's
 * photo carries `data-hero` (named `hero` in CSS) for the "after" one, and the browser morphs
 * one into the other while the rest of the screen cross-fades.
 *
 * The profile shows its loading skeleton first, so the photo URL the card already loaded is
 * handed over (`readHandoff`) and the skeleton paints that same image right away.
 *
 * Without the API (Firefox < 144, older Safari) or with Reduce Motion on, this is a plain
 * navigation and the usual screen slide plays.
 */

type Router = { push: (href: string) => void; back: () => void };

export type Handoff = {
  /** Which person or band, matching the destination's data-hero value. */
  key: string;
  /** The exact image the card was showing (already in the browser cache). */
  src?: string;
  /** Their color, painted under the photo. */
  tint?: string;
  /** Where the card was, so Back can shrink the photo into it again. */
  from: string;
};

let handoff: (Handoff & { at: number }) | null = null;
let active = false;

/** True while a shared-element transition is running; screens skip their own slide-in. */
export function isHeroTransitionActive() {
  return active;
}

/** The photo handed over for `key` in the last minute, if any. */
export function readHandoff(key: string): Handoff | null {
  if (!handoff || handoff.key !== key) return null;
  if (performance.now() - handoff.at > 60_000) return null;
  return handoff;
}

type VTDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> };
};

function supported(): VTDocument | null {
  if (typeof document === "undefined") return null;
  const doc = document as VTDocument;
  if (!doc.startViewTransition) return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return doc;
}

/** Resolve once `selector` is in the page, or after `max` ms: the morph can't wait longer than a blink. */
function whenPresent(selector: string, max: number) {
  return new Promise<Element | null>((resolve) => {
    const found = document.querySelector(selector);
    if (found) return resolve(found);
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        clearTimeout(timer);
        resolve(el);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      obs.disconnect();
      resolve(document.querySelector(selector));
    }, max);
  });
}

/**
 * Next's router writes the URL twice (push, then a replaceState once the new screen commits).
 * Chrome cancels a running view transition on that second write, so the "after" snapshot
 * waits for it (or gives up after `max` ms).
 */
function routerSettled(max: number) {
  return new Promise<void>((resolve) => {
    const original = history.replaceState;
    const done = () => {
      if (history.replaceState !== original) history.replaceState = original;
      clearTimeout(timer);
      resolve();
    };
    history.replaceState = function (...args: Parameters<History["replaceState"]>) {
      original.apply(history, args);
      // Let the router finish the task it's in before we snapshot.
      setTimeout(done, 0);
    };
    const timer = setTimeout(done, max);
  });
}

/** An element's corner radius in px, capped at a circle (rounded-full reports a huge number). */
function radiusOf(el: Element | null) {
  if (!(el instanceof HTMLElement)) return "0px";
  const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  const box = el.getBoundingClientRect();
  return `${Math.min(r, Math.min(box.width, box.height) / 2)}px`;
}

/** The photo's corners morph too: from the card's radius to the hero's, via these variables. */
function setCorners(from: Element | null, to: Element | null) {
  const root = document.documentElement.style;
  root.setProperty("--vt-from-radius", radiusOf(from));
  root.setProperty("--vt-to-radius", radiusOf(to));
}

function run(doc: VTDocument, update: () => Promise<void>, after?: () => void) {
  active = true;
  const done = () => {
    active = false;
    after?.();
  };
  try {
    doc.startViewTransition!(update).finished.then(done, done);
  } catch {
    done();
  }
}

function setName(el: Element | null, name: string) {
  if (el instanceof HTMLElement) el.style.setProperty("view-transition-name", name);
}

/**
 * Open `href` with `source` (the tapped photo's box) growing into the next screen's hero.
 * Returns false when it navigated plainly, so callers never need a second path.
 */
export function openWithHero(router: Router, href: string, source: HTMLElement, data: Omit<Handoff, "from">) {
  const doc = supported();
  const img = source.querySelector("img");
  handoff = { ...data, src: img?.currentSrc || img?.src || data.src, from: location.pathname + location.search, at: performance.now() };
  if (!doc) {
    router.push(href);
    return false;
  }
  setName(source, "hero");
  const fromRadius = radiusOf(source);
  run(doc, async () => {
    setName(source, "");
    const settled = routerSettled(450);
    router.push(href);
    const [dest] = await Promise.all([whenPresent(`[data-hero="${CSS.escape(data.key)}"]`, 450), settled]);
    setCorners(null, dest);
    document.documentElement.style.setProperty("--vt-from-radius", fromRadius);
  });
  return true;
}

/**
 * Back from a hero screen: shrink its photo into the card it came from, when that card is
 * on the screen we're returning to. Otherwise just go back.
 */
export function backWithHero(router: Router, key: string, fallbackHref: string) {
  const doc = supported();
  const came = handoff && handoff.key === key ? handoff.from : null;
  const go = () => (came ? router.back() : router.push(fallbackHref));
  if (!doc || !came) return go();
  let card: Element | null = null;
  run(
    doc,
    async () => {
      const hero = document.querySelector(`[data-hero="${CSS.escape(key)}"]`);
      const fromRadius = radiusOf(hero);
      if (hero instanceof HTMLElement) hero.style.setProperty("view-transition-name", "none");
      const settled = routerSettled(350);
      go();
      [card] = await Promise.all([whenPresent(`[data-hero-card="${CSS.escape(key)}"]`, 350), settled]);
      setName(card, "hero");
      setCorners(null, card);
      document.documentElement.style.setProperty("--vt-from-radius", fromRadius);
    },
    // The card is an ordinary card again once the photo has landed.
    () => setName(card, ""),
  );
}
