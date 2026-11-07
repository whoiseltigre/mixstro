/** Notification kinds and defaults (#9), shared by the settings screen and the server that sends. */

export type Channel = "push" | "email";
export type NotificationType = { id: string; title: string; sub: string; defaults: Record<Channel, boolean> };

export const NOTIFICATION_TYPES: NotificationType[] = [
  { id: "connect", title: "New Connects", sub: "When someone wants to play with you", defaults: { push: true, email: true } },
  { id: "message", title: "Messages", sub: "New messages and voice notes", defaults: { push: true, email: false } },
  { id: "jam", title: "Jam invites", sub: "Invites, new times, and reminders", defaults: { push: true, email: true } },
  { id: "board", title: "Board replies", sub: "When someone answers your post", defaults: { push: true, email: false } },
  { id: "alerts", title: "Musicians you're looking for", sub: "When the role you need joins nearby", defaults: { push: true, email: false } },
  { id: "digest", title: "Weekly digest", sub: "New people and posts in your area, once a week", defaults: { push: false, email: true } },
];

export type Prefs = Record<string, boolean>; // "<type>.<channel>" → on/off; missing means default

export function wants(prefs: Prefs, type: string, channel: Channel) {
  const key = `${type}.${channel}`;
  if (key in prefs) return prefs[key];
  return NOTIFICATION_TYPES.find((t) => t.id === type)?.defaults[channel] ?? false;
}

