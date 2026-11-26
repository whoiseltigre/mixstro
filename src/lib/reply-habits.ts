/**
 * Reply habits: how reliably someone answers Connects (public.reply_stats, last 90 days).
 * Good habits get a short line on their profile; poor ones are never shown, only ranked lower.
 */

export type ReplyStats = { asked: number; answered: number; medianHours: number | null };

/** Below this many Connects to judge, say nothing either way. */
export const MIN_ASKED = 3;

export function replyHabit(s: ReplyStats | undefined): { label?: string; slow: boolean } {
  if (!s || s.asked < MIN_ASKED) return { slow: false };
  const rate = s.answered / s.asked;
  if (rate < 0.3) return { slow: true };
  if (rate < 0.7) return { slow: false };
  if (s.medianHours !== null && s.medianHours <= 24) return { label: "Usually replies within a day", slow: false };
  if (s.medianHours !== null && s.medianHours <= 72) return { label: "Usually replies within a few days", slow: false };
  return { label: "Usually replies", slow: false };
}
