import { NextResponse } from "next/server";
import { castVote, countEvent, createBallot, getBallot, isBallotId, newRound, validOptions, voterId, type Kind } from "@/lib/band-names/ballots";
import { callerIp, readLimited, withinBudget, type Budget } from "@/lib/request-guard";

const EVENTS = new Set(["bng_generate", "bng_shortlist", "bng_check", "bng_share", "bng_story", "bng_signup_click"]);
const KINDS = new Set<Kind>(["band", "single", "closer"]);
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Band votes and tool counts for mixstro.com/band-name-generator. Small JSON in, small JSON out. */
const HOUR = 3600;
/** Per browser, per address, and for everyone together. A busy address can't use up everyone else's room. */
async function budgets(action: string, perCaller: number, perIp: number, all: number): Promise<Budget[]> {
  const ip = await callerIp();
  const voter = (await voterId(false)) ?? "none";
  return [
    { key: `bng:${action}:v:${voter}`, limit: perCaller, windowSeconds: HOUR },
    { key: `bng:${action}:ip:${ip}`, limit: perIp, windowSeconds: HOUR },
    { key: `bng:${action}:all`, limit: all, windowSeconds: HOUR },
  ];
}
const BUSY = () => json({ error: "Lots of votes right now. Try again in a few minutes." }, 429);

export async function POST(req: Request) {
  const text = await readLimited(req, 2048);
  if (text === null) return json({ error: "Too large." }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const action = body.action;

  if (action === "event") {
    // Low-trust telemetry: counted only within budget, and never used as a conversion.
    if (typeof body.name === "string" && EVENTS.has(body.name) && (await withinBudget(await budgets("event", 200, 600, 20000)))) await countEvent(body.name);
    return json({ ok: true });
  }

  if (action === "create") {
    const options = validOptions("band", body.options);
    if (!options) return json({ error: "Pick three different names." }, 400);
    if (!(await withinBudget(await budgets("create", 10, 30, 300)))) return BUSY();
    const id = await createBallot(options);
    if (id === "busy") return BUSY();
    if (!id) return json({ error: "Couldn't start the vote. Try again in a minute." }, 503);
    await countEvent("bng_vote_created");
    return json({ id, url: `/band-name-generator/vote/${id}` }, 201);
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!isBallotId(id)) return json({ error: "That vote doesn't exist." }, 404);
  const round = Number(body.round);

  if (action === "get") {
    const ballot = await getBallot(id);
    return ballot ? json({ ballot }) : json({ error: "That vote doesn't exist." }, 404);
  }

  if (action === "vote") {
    const choice = Number(body.choice);
    if (!Number.isInteger(round) || !Number.isInteger(choice) || choice < 0 || choice > 2) return json({ error: "Pick one of the three." }, 400);
    if (!(await withinBudget(await budgets("vote", 60, 200, 20000)))) return BUSY();
    const r = await castVote(id, round, choice);
    if (r.error) return json({ error: r.error }, 409);
    await countEvent("bng_vote_cast");
    return json({ ballot: r.ballot });
  }

  if (action === "round") {
    const kind = body.kind as Kind;
    if (!KINDS.has(kind)) return json({ error: "Pick a question." }, 400);
    const options = validOptions(kind, body.options);
    if (!options) return json({ error: kind === "band" ? "Enter three different band names." : "Enter three different song titles." }, 400);
    if (!Number.isInteger(round)) return json({ error: "Refresh and try again." }, 400);
    if (!(await withinBudget(await budgets("round", 30, 60, 3000)))) return BUSY();
    const r = await newRound(id, round, kind, options);
    if (r.error) return json({ error: r.error }, 409);
    await countEvent("bng_round");
    return json({ ballot: r.ballot });
  }

  return json({ error: "Unknown request." }, 400);
}
