"use client";

/** A message time in the viewer's own timezone: "7:42 PM" today, "Tue" this week, "Oct 3" after that. */
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return <span className={className}>{iso}</span>;
  const now = new Date();
  const label =
    d.toDateString() === now.toDateString()
      ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : now.getTime() - d.getTime() < 6 * 86_400_000
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
