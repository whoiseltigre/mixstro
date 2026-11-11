/** "Open to": what someone is up for right now, shown on their profile (profiles.open_to). */
export const OPEN_TO = [
  { id: "band", label: "Joining a band", color: "#B5C5FF" },
  { id: "sessions", label: "Session work", color: "#FFB245" },
  { id: "gigs", label: "Paid gigs", color: "#67E2DA" },
  { id: "fill_in", label: "Filling in", color: "#FFACBA" },
  { id: "teaching", label: "Teaching", color: "#C9B6FF" },
  { id: "cowrite", label: "Co-writing", color: "#F7BF77" },
] as const;

export type OpenToId = (typeof OPEN_TO)[number]["id"];

export const openToLabels = (ids: string[] | undefined) => OPEN_TO.filter((o) => ids?.includes(o.id));
