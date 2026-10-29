/** "Active this week" and dormant-profile rules (#2). Kept in one place so Today, search and profiles agree. */

const DAY = 24 * 60 * 60 * 1000;
export const ACTIVE_DAYS = 7;
export const DORMANT_DAYS = 60;

export function daysSince(iso: string | Date, now = Date.now()) {
  return Math.floor((now - new Date(iso).getTime()) / DAY);
}

export const isActiveThisWeek = (lastActiveAt: string | Date) => daysSince(lastActiveAt) < ACTIVE_DAYS;

/** Dormant profiles drop out of Today and search (see the discoverable_profiles view). */
export const isDormant = (lastActiveAt: string | Date) => daysSince(lastActiveAt) >= DORMANT_DAYS;

/** A short, kind label. Nothing is shown for people who've been away a while. */
export function activityLabel(lastActiveAt: string | Date): string | null {
  const d = daysSince(lastActiveAt);
  if (d < 1) return "Active today";
  if (d < ACTIVE_DAYS) return "Active this week";
  return null;
}
