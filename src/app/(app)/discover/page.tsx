import { getToday } from "@/lib/people";
import { TodayDeck } from "./today-deck";

export const metadata = { title: "Today · Mixstro" };
export const dynamic = "force-dynamic";

export default async function Discover() {
  const { people, incoming } = await getToday();
  return <TodayDeck people={people} incoming={incoming} />;
}
