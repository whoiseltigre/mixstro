import { getSearchable } from "@/lib/people";
import { SearchList } from "./search-list";

export const metadata = { title: "Search · Mixstro" };
export const dynamic = "force-dynamic";

export default async function Search() {
  return <SearchList people={await getSearchable()} />;
}
