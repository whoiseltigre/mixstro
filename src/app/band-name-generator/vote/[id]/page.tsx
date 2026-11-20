import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/blog";
import { QUESTION, getBallot, isBallotId } from "@/lib/band-names/ballots";
import { BallotView } from "./ballot";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const b = isBallotId(id) ? await getBallot(id) : null;
  const title = b ? QUESTION[b.kind] : "Band vote";
  // Chat previews show the question and the three options. Nothing private is in here.
  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} · Mixstro`,
    description: b ? b.options.join(" · ") : undefined,
    robots: { index: false, follow: false },
    openGraph: { title, description: b ? `${b.options.join(" · ")}. Vote in one tap, no sign-up.` : undefined, images: [{ url: "/site/v1/og-card.jpg", width: 1200, height: 630 }] },
  };
}

export default async function VotePage({ params }: Props) {
  const { id } = await params;
  if (!isBallotId(id)) notFound();
  const ballot = await getBallot(id);
  if (!ballot) notFound();
  return (
    <main>
      <div className="mxb-glow" aria-hidden="true" />
      <div className="mxb-wrap">
        <BallotView initial={ballot} />
      </div>
    </main>
  );
}
