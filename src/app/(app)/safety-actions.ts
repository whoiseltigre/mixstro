"use server";

import { after } from "next/server";
import { notifySafety } from "@/lib/notify";
import { getViewer } from "@/lib/people";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tells the Mixstro team about a block or report you just filed. */
export async function alertSafetyTeam(kind: "block" | "report", reportedId: string) {
  const viewer = await getViewer();
  if (!viewer || !UUID.test(reportedId) || (kind !== "block" && kind !== "report")) return;
  // notifySafety checks the block or report row exists before sending anything.
  after(() => notifySafety(kind, viewer.id, reportedId));
}
