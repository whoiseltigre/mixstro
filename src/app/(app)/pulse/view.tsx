import { BackButton } from "@/components/ui";

type Cohort = {
  week: string;
  signups: number;
  finished: number;
  activated: number;
  connected: number;
  week1_known: boolean;
  week4: number;
  week4_known: boolean;
  sharers: number;
  brought: number;
};
type Replies = { week: string; started: number; replied: number };
export type Pulse = {
  generated_at: string;
  cohorts: Cohort[];
  replies: Replies[];
  active_30d: number;
  played_30d: number;
  real_people: number;
  survey: { answers: number; very: number; somewhat: number; not: number; instead: { text: string; at: string; answer: string }[] };
  notes: { body: string; at: string; username: string }[];
};

/** Below this many people a percentage is noise. */
const MIN_N = 10;

const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((n, r) => n + f(r), 0);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const weekLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

type Tile = { name: string; value: string; target: string; sub: string; state: "hit" | "miss" | "early" };

function tiles(p: Pulse): Tile[] {
  // Rates over the last four signup weeks old enough to judge.
  const w1 = p.cohorts.filter((c) => c.week1_known).slice(0, 4);
  const w4 = p.cohorts.filter((c) => c.week4_known).slice(0, 4);
  const signups1 = sum(w1, (c) => c.signups);
  const signups4 = sum(w4, (c) => c.signups);
  const rep = p.replies.slice(0, 4);
  const started = sum(rep, (r) => r.started);
  const allSignups = sum(p.cohorts, (c) => c.signups);
  const sharers = sum(p.cohorts, (c) => c.sharers);
  const brought = sum(p.cohorts, (c) => c.brought);

  const rate = (name: string, a: number, n: number, target: number, sub: string): Tile => ({
    name,
    value: n ? `${pct(a, n)}%` : "–",
    target: `${target}%`,
    sub: `${a} of ${n} ${sub}`,
    state: n < MIN_N ? "early" : pct(a, n) >= target ? "hit" : "miss",
  });

  return [
    rate("Activation", sum(w1, (c) => c.activated), signups1, 40, "signups reached out in week 1"),
    rate("Connected", sum(w1, (c) => c.connected), signups1, 30, "signups had a Connect accepted in week 1"),
    rate("Reply rate", sum(rep, (r) => r.replied), started, 50, "first messages answered within 48h"),
    {
      name: "Played together",
      value: String(p.played_30d),
      target: "Rising",
      sub: `jams confirmed in 30 days · ${p.active_30d} people active`,
      state: p.active_30d < MIN_N ? "early" : p.played_30d > 0 ? "hit" : "miss",
    },
    rate("Week 4 retention", sum(w4, (c) => c.week4), signups4, 20, "signups came back in week 4"),
    {
      name: "Share loop",
      value: `${pct(sharers, allSignups)}%`,
      target: "15% · 0.3",
      sub: `${sharers} shared their page · ${sharers ? (brought / sharers).toFixed(1) : "0"} signups per sharer`,
      state: allSignups < MIN_N ? "early" : pct(sharers, allSignups) >= 15 && brought / Math.max(sharers, 1) >= 0.3 ? "hit" : "miss",
    },
    {
      name: "PMF survey",
      value: p.survey.answers ? `${pct(p.survey.very, p.survey.answers)}%` : "–",
      target: "40%",
      sub: `${p.survey.very} of ${p.survey.answers} very disappointed · needs 40 answers`,
      state: p.survey.answers < 40 ? "early" : pct(p.survey.very, p.survey.answers) >= 40 ? "hit" : "miss",
    },
  ];
}

const STATE = {
  hit: { label: "On track", dot: "bg-tungsten" },
  miss: { label: "Below target", dot: "bg-[#FF6B5A]" },
  early: { label: "Too early to tell", dot: "bg-paper/30" },
} as const;

export function PulseView({ p }: { p: Pulse }) {
  const replies = new Map(p.replies.map((r) => [r.week, r]));

  return (
    <main className="pt-safe md:pt-6 px-5 md:px-0 pb-32 md:pb-16 flex flex-col gap-8 md:max-w-[1040px] md:mx-auto">
      <header className="mt-3 flex items-center gap-3">
        <BackButton href="/settings" />
        <div className="flex flex-col">
          <h1 className="headline text-[28px]">Pulse</h1>
          <span className="text-[13px] text-smoke">
            {p.real_people} real musicians · updated{" "}
            {new Date(p.generated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      </header>

      <section aria-labelledby="signals" className="flex flex-col gap-3">
        <h2 id="signals" className="text-[17px] font-semibold">The seven signals</h2>
        <p className="text-[13px] text-smoke text-pretty -mt-1">
          Rates use the last four signup weeks old enough to judge. Sample people, your account and test accounts are left out.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {tiles(p).map((t) => (
            <li key={t.name} className="p-4 rounded-[20px] bg-stage border border-paper/8 flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-smoke">{t.name}</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[34px] font-semibold leading-none tabular-nums">{t.value}</span>
                <span className="text-[13px] text-smoke">target {t.target}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                <span className={`size-2 rounded-full ${STATE[t.state].dot}`} aria-hidden="true" />
                {STATE[t.state].label}
              </span>
              <span className="text-[12.5px] text-smoke text-pretty">{t.sub}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="weeks" className="flex flex-col gap-3">
        <h2 id="weeks" className="text-[17px] font-semibold">By signup week</h2>
        <div className="overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-[14px] tabular-nums">
            <thead>
              <tr className="text-left text-[12px] text-smoke">
                <th className="py-2 pr-3 font-semibold">Week of</th>
                <th className="py-2 px-3 font-semibold text-right">Signups</th>
                <th className="py-2 px-3 font-semibold text-right">Finished</th>
                <th className="py-2 px-3 font-semibold text-right">Activated</th>
                <th className="py-2 px-3 font-semibold text-right">Connected</th>
                <th className="py-2 px-3 font-semibold text-right">Replied 48h</th>
                <th className="py-2 px-3 font-semibold text-right">Week 4</th>
                <th className="py-2 pl-3 font-semibold text-right">Shared</th>
              </tr>
            </thead>
            <tbody>
              {p.cohorts.map((c) => {
                const r = replies.get(c.week);
                return (
                  <tr key={c.week} className="border-t border-paper/8">
                    <td className="py-2.5 pr-3 font-semibold">{weekLabel(c.week)}</td>
                    <td className="py-2.5 px-3 text-right">{c.signups}</td>
                    <td className="py-2.5 px-3 text-right">{pct(c.finished, c.signups)}%</td>
                    <td className="py-2.5 px-3 text-right">{c.week1_known ? `${pct(c.activated, c.signups)}%` : <Pending />}</td>
                    <td className="py-2.5 px-3 text-right">{c.week1_known ? `${pct(c.connected, c.signups)}%` : <Pending />}</td>
                    <td className="py-2.5 px-3 text-right">{r?.started ? `${pct(r.replied, r.started)}% of ${r.started}` : "–"}</td>
                    <td className="py-2.5 px-3 text-right">{c.week4_known ? `${pct(c.week4, c.signups)}%` : <Pending />}</td>
                    <td className="py-2.5 pl-3 text-right">{c.sharers}</td>
                  </tr>
                );
              })}
              {!p.cohorts.length && (
                <tr>
                  <td colSpan={8} className="py-6 text-smoke">No signups in the last ten weeks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <section aria-labelledby="instead" className="flex flex-col gap-3">
          <h2 id="instead" className="text-[17px] font-semibold">What they&apos;d use instead</h2>
          <p className="text-[13px] text-smoke -mt-1">
            Survey: {p.survey.very} very, {p.survey.somewhat} somewhat, {p.survey.not} not disappointed.
          </p>
          <Quotes items={p.survey.instead.map((i) => ({ text: i.text, meta: `${i.answer} · ${day(i.at)}` }))} empty="No answers yet." />
        </section>
        <section aria-labelledby="notes" className="flex flex-col gap-3">
          <h2 id="notes" className="text-[17px] font-semibold">Feedback</h2>
          <Quotes items={p.notes.map((n) => ({ text: n.body, meta: `@${n.username} · ${day(n.at)}` }))} empty="Nothing sent yet." />
        </section>
      </div>
    </main>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Pending() {
  return <span className="text-smoke">too new</span>;
}

function Quotes({ items, empty }: { items: { text: string; meta: string }[]; empty: string }) {
  if (!items.length) return <p className="text-[14px] text-smoke">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((q, i) => (
        <li key={i} className="p-3.5 rounded-[16px] bg-stage flex flex-col gap-1">
          <span className="text-[14.5px] text-pretty whitespace-pre-line">{q.text}</span>
          <span className="text-[12px] text-smoke">{q.meta}</span>
        </li>
      ))}
    </ul>
  );
}
