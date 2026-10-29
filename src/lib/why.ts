import { COMMITMENT } from "./onboarding";

/** "Why you two" (#5): one plain line on each Today card saying what two musicians have in common. */

export type WhyInput = {
  /** Names of influences you both list, strongest first. */
  shared: string[];
  /** Both commitment levels (index into COMMITMENT), when known. */
  myCommitment?: number;
  theirCommitment?: number;
  /** Days you both play, e.g. ["Thu", "Sat"]. */
  sharedDays?: string[];
  distanceMi?: number;
};

const WANT = ["play just for fun", "play weekly", "gig", "tour"];
const DAY_NAME: Record<string, string> = { Mon: "Mondays", Tue: "Tuesdays", Wed: "Wednesdays", Thu: "Thursdays", Fri: "Fridays", Sat: "Saturdays", Sun: "Sundays" };

const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

export function whyYouTwo({ shared, myCommitment, theirCommitment, sharedDays = [], distanceMi }: WhyInput): string {
  const parts: string[] = [];
  if (shared.length) parts.push(`you both love ${and(shared.slice(0, 2))}`);
  if (myCommitment != null && myCommitment === theirCommitment && COMMITMENT[myCommitment]) parts.push(`both want to ${WANT[myCommitment]}`);
  if (parts.length < 2 && sharedDays.length) parts.push(`both free ${and(sharedDays.slice(0, 2).map((d) => DAY_NAME[d] ?? d))}`);
  if (distanceMi != null) parts.push(`${Math.max(1, Math.round(distanceMi))} mi apart`);
  if (!parts.length) return "New in your area.";
  const line = parts.join(", ");
  return line[0].toUpperCase() + line.slice(1) + ".";
}
