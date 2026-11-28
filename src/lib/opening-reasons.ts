/**
 * Why someone is worth meeting for an opening, in words a musician can check against their
 * profile. Only what the profile fields support: a weekday they both rehearse is a shared day,
 * never a promise they're free at a particular time.
 */
export type CandidateFacts = { reciprocal: boolean; sharedDays: string[]; sharedArtists: number; miles: number | null };

const DAY_NAME: Record<string, string> = { Mon: "Mondays", Tue: "Tuesdays", Wed: "Wednesdays", Thu: "Thursdays", Fri: "Fridays", Sat: "Saturdays", Sun: "Sundays" };

/** `offeredNoun`: what the poster plays, as a person ("bassist"). */
export function reasonsFor(f: CandidateFacts, offeredNoun?: string): string[] {
  const out: string[] = [];
  if (f.reciprocal && offeredNoun) out.push(`Looking for a ${offeredNoun}`);
  if (f.sharedDays.length) {
    const days = f.sharedDays.map((d) => DAY_NAME[d] ?? d);
    out.push(`Also rehearses ${days.length > 1 ? `${days.slice(0, -1).join(", ")} and ${days.at(-1)}` : days[0]}`);
  }
  if (f.sharedArtists > 0) out.push(`${f.sharedArtists} artist${f.sharedArtists === 1 ? "" : "s"} in common`);
  if (f.miles !== null) out.push(f.miles <= 1 ? "Nearby" : `${f.miles} mi away`);
  return out;
}

export type OpeningStatus = "open" | "paused" | "filled" | "expired";

/** "Open · 9 days left", "Paused", "Filled", "Expired". */
export function statusLine(status: OpeningStatus, expiresAt: string | null, now = Date.now()): string {
  if (status !== "open") return status[0].toUpperCase() + status.slice(1);
  if (!expiresAt) return "Open";
  const days = Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000);
  return days <= 0 ? "Expires today" : `Open · ${days} day${days === 1 ? "" : "s"} left`;
}
