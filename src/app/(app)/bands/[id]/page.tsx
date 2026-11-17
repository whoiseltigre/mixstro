import { notFound } from "next/navigation";
import { getBandHub } from "@/lib/band-hub";
import { BandHubView } from "./hub";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hub = await getBandHub(id);
  return { title: hub ? `${hub.band.name} · Your band · Mixstro` : "Mixstro" };
}

/** Your band: where current members run it. Only members get in. */
export default async function YourBand({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hub = await getBandHub(id);
  if (!hub) notFound();
  return <BandHubView hub={hub} />;
}
