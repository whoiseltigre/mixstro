export type BoardKind = "band_seeking" | "session" | "collab";
export const KIND_LABEL: Record<BoardKind, string> = { band_seeking: "Band seeking", session: "Session", collab: "Collab" };
export const KINDS = Object.keys(KIND_LABEL) as BoardKind[];
