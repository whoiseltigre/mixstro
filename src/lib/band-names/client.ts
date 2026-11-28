/** Browser helpers shared by the generator and the vote page. */

export async function api<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/band-names", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "That didn't work. Try again.");
  return data as T;
}

/** Count a tool event for Pulse. Fire and forget; never blocks the page. */
export function track(name: string) {
  try {
    fetch("/api/band-names", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "event", name }), keepalive: true }).catch(() => {});
  } catch {}
}

/** Where "Start this band on Mixstro" goes: the app's signup, with the name carried over. */
export function startBandUrl(name?: string) {
  const u = new URL("https://app.mixstro.com/");
  if (name) u.searchParams.set("band", name);
  u.searchParams.set("utm_source", "band-name-generator");
  u.searchParams.set("utm_medium", "tool");
  return u.toString();
}

const RECENT = "mixstro-band-votes-v1";
export type RecentVote = { id: string; label: string };

export function recentVotes(): RecentVote[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT) ?? "[]");
    return Array.isArray(v) ? v.filter((r) => r && /^[0-9a-f-]{36}$/.test(r.id) && typeof r.label === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function rememberVote(id: string, label: string) {
  try {
    localStorage.setItem(RECENT, JSON.stringify([{ id, label }, ...recentVotes().filter((r) => r.id !== id)].slice(0, 5)));
  } catch {}
}

/** Native share sheet, then the clipboard, then the text itself for the person to copy. */
export async function shareText(title: string, text: string, url: string): Promise<"shared" | "copied" | string> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return `${text} ${url}`;
  }
}
