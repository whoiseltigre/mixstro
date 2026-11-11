import Link from "next/link";
import { GetStartedCard } from "@/components/get-started";
import { RoleAlertCard } from "@/components/role-alert";
import { getGetStarted, nobodyNearby } from "@/lib/get-started";
import { YOUR_TURN_LIMIT, getRoleAlert, getToday } from "@/lib/people";
import { TodayDeck } from "./today-deck";

export const metadata = { title: "Today · Mixstro" };
export const dynamic = "force-dynamic";

export default async function Discover() {
  const [{ people, incoming, yourTurn }, alert, started] = await Promise.all([
    getToday(),
    getRoleAlert().catch(() => null),
    getGetStarted().catch(() => null),
  ]);
  if (yourTurn >= YOUR_TURN_LIMIT) return <YourTurnPause count={yourTurn} />;
  const start = started && (people.some((m) => !m.sample) ? started : nobodyNearby(started));
  return (
    <>
      {/* One card at a time at the top: a new musician you're looking for beats the checklist. */}
      {alert ? <RoleAlertCard alert={alert} /> : start && <GetStartedCard state={start} />}
      <TodayDeck people={people} incoming={incoming} />
    </>
  );
}

/** #4 Hinge-style pause: answer some chats (or close them with a one-tap reply) and Today comes back. */
function YourTurnPause({ count }: { count: number }) {
  return (
    <main className="relative min-h-dvh md:min-h-[calc(100dvh-88px)] px-5 md:px-0 pt-safe pb-32 flex flex-col justify-center gap-3 md:max-w-[560px]">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[-120px] -translate-x-1/2 w-[520px] h-[360px] rounded-full opacity-25 blur-[90px] pointer-events-none"
        style={{ background: "radial-gradient(#67E2DA, transparent 70%)" }}
      />
      <h1 className="relative headline text-[40px] leading-none">Your turn first</h1>
      <p className="relative text-[16px] leading-[1.5] text-smoke">
        {count} musicians are waiting on a reply from you. Answer a few, even with a quick &ldquo;not the right fit&rdquo;, and Today opens back up. Only you can see this.
      </p>
      <div className="relative flex gap-2.5 pt-3">
        <Link href="/messages" className="h-12 px-5 rounded-full bg-paper text-ink text-[16px] font-semibold flex items-center">
          Open your chats
        </Link>
      </div>
    </main>
  );
}
