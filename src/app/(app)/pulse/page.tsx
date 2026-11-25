import { notFound } from "next/navigation";
import { getViewer } from "@/lib/people";
import { PulseView, type OpeningPulse, type Pulse, type ToolPulse } from "./view";

export const metadata = { title: "Pulse · Mixstro", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Pulse: the product-market-fit numbers, by signup week. Only accounts listed in
 * public.pulse_viewers get data back from pmf_pulse(); everyone else gets a 404.
 * Sample people never count (they aren't in the database), and neither do Pulse
 * viewers or anyone in public.metrics_excluded.
 */
export default async function PulsePage() {
  const viewer = await getViewer();
  if (!viewer) notFound();
  const [{ data }, tool, openings] = await Promise.all([viewer.supabase.rpc("pmf_pulse"), viewer.supabase.rpc("tool_pulse"), viewer.supabase.rpc("opening_pulse")]);
  if (!data) notFound();
  // Band name generator numbers. Missing until its SQL is applied, so the section just hides.
  return <PulseView p={data as Pulse} tool={(tool.data as ToolPulse | null) ?? undefined} openings={(openings.data as OpeningPulse | null) ?? undefined} />;
}
