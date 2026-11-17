import { getBands } from "@/lib/band-hub";
import { getSearchable, getViewer } from "@/lib/people";
import { SearchList } from "./search-list";

export const metadata = { title: "Search · Mixstro" };
export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, people, bands, viewer] = await Promise.all([searchParams, getSearchable(), getBands(), getViewer()]);
  const plays = viewer?.profile ? [viewer.profile.main_instrument, ...viewer.profile.instruments].filter((x): x is string => Boolean(x)) : [];
  return <SearchList people={people} bands={bands} plays={plays} initialTab={tab === "bands" ? "bands" : "people"} />;
}
