import { NextResponse } from "next/server";
import { castVote, countEvent, createBallot, getBallot, isBallotId, newRound, validOptions, type Kind } from "@/lib/band-names/ballots";

const EVENTS = new Set(["bng_generate", "bng_shortlist", "bng_check", "bng_share", "bng_story", "bng_signup_click"]);
const KINDS = new Set<Kind>(["band", "single", "closer"]);
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Band votes and tool counts for mixstro.com/band-name-generator. Small JSON in, small JSON out. */
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 2048) return json({ error: "Too large." }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const action = body.action;

  if (action === "event") {
    if (typeof body.name === "string" && EVENTS.has(body.name)) await countEvent(body.name);
    return json({ ok: true });
  }

  if (action === "create") {
    const options = validOptions("band", body.options);
    if (!options) return json({ error: "Pick three different names." }, 400);
    const id = await createBallot(options);
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
    const r = await newRound(id, round, kind, options);
    if (r.error) return json({ error: r.error }, 409);
    await countEvent("bng_round");
    return json({ ballot: r.ballot });
  }

  return json({ error: "Unknown request." }, 400);
}
