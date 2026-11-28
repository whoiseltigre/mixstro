/**
 * The design tokens that code needs as values (inline styles, canvas, share cards, alpha math).
 * Mirrors src/styles/tokens.css; in class names use the Tailwind utilities instead
 * (text-tungsten, bg-gel-blue/15). See DESIGN.md.
 */

export const COLOR = {
  ink: "#0F0D0B",
  stage: "#1A1816",
  riser: "#292624",
  smoke: "#A8A49E",
  paper: "#F5F1EC",
  tungsten: "#FFB245",
  danger: "#FF453A",
  success: "#30D158",
} as const;

/** The gels: Mixstro's color splashes. One per area of the app. */
export const GEL = {
  peach: "#F7BF77",
  pink: "#FFACBA",
  blue: "#B5C5FF",
  teal: "#67E2DA",
  violet: "#C9B6FF",
} as const;

/** Which gel lights which area (the "stage spill" glow at the top of each screen). */
export const AREA_GEL: Record<string, string> = {
  "/discover": GEL.peach,
  "/board": GEL.blue,
  "/messages": GEL.teal,
  "/me": GEL.pink,
  "/bands": GEL.violet,
  "/search": GEL.blue,
  "/settings": GEL.peach,
};

/** Board post kinds and their gel. */
export const POST_KIND_GEL: Record<string, string> = { "Band seeking": GEL.blue, Session: GEL.teal, Collab: GEL.pink };

/** Motion values for JS-driven animation (Web Animations, drag release), matching the CSS tokens. */
export const MOTION = {
  instant: 90,
  quick: 160,
  base: 280,
  slow: 450,
  springMs: 520,
  easeStandard: "cubic-bezier(0.2, 0.9, 0.25, 1)",
  easeSettle: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  easeExit: "cubic-bezier(0.4, 0, 0.9, 0.6)",
  /** Read the spring from CSS so JS and CSS always share one curve. */
  spring: (kind: "smooth" | "snappy" | "bouncy" = "smooth") =>
    typeof document === "undefined" ? "ease-out" : getComputedStyle(document.documentElement).getPropertyValue(`--spring-${kind}`).trim() || "ease-out",
} as const;
