import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Wordmark } from "@/components/ui";
import { getViewer } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";
import { ConfirmSpot } from "./confirm";

/**
 * "Confirm your spot": where a bandmate tag lands. Members confirm in one tap; anyone
 * else joins Mixstro first (the link is remembered) and confirms after signing up.
 */

export const dynamic = "force-dynamic";

type Invite = {
  band: string;
  status: "pending" | "confirmed" | "declined";
  for_someone_else: boolean;
  from: { username: string; first_name: string; avatar_url: string | null };
  start_year: number | null;
  end_year: number | null;
  members: number;
};

type Params = { params: Promise<{ token: string }> };

async function load(token: string): Promise<Invite | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.rpc("band_invite", { p_token: token });
  return (data as Invite | null) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const invite = await load((await params).token);
  if (!invite) return { title: "Mixstro" };
  const title = `${invite.from.first_name} added you to ${invite.band}`;
  return { title, description: "Confirm your spot on Mixstro and the band shows on your profile too.", openGraph: { title, siteName: "Mixstro" }, robots: { index: false } };
}

export default async function Join({ params }: Params) {
  const { token } = await params;
  const invite = await load(token);
  if (!invite) notFound();
  const viewer = await getViewer();
  const years = invite.start_year ? (invite.end_year === null ? `${invite.start_year} to now` : invite.end_year === invite.start_year ? `${invite.start_year}` : `${invite.start_year} to ${invite.end_year}`) : "";
  const others = invite.members - 1;

  return (
    <main className="min-h-dvh flex flex-col items-center px-5 pt-safe pb-safe">
      <header className="w-full max-w-[440px] mt-5 flex justify-center">
        <Link href="/" aria-label="Mixstro home">
          <Wordmark size={26} />
        </Link>
      </header>
      <div className="w-full max-w-[440px] my-auto py-10 flex flex-col gap-6">
        <div className="gel-rim rounded-[28px]">
          <div className="rounded-[26.5px] bg-stage p-6 flex flex-col items-center text-center gap-4">
            <span className="relative size-20 rounded-full overflow-hidden bg-riser">
              {invite.from.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={invite.from.avatar_url} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
              )}
            </span>
            <h1 className="headline text-[30px] leading-[1.05] text-balance">
              {invite.from.first_name} added you to {invite.band}
            </h1>
            <p className="text-[15px] text-smoke text-pretty">
              {[years, others > 0 ? `${invite.from.first_name} and ${others} other${others === 1 ? "" : "s"} confirmed` : ""].filter(Boolean).join(" · ")}
              {years || others > 0 ? <br /> : null}
              Confirm your spot and the band shows on your profile too, with everyone who played in it.
            </p>
          </div>
        </div>

        {invite.status !== "pending" ? (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-[15px] text-smoke">This link was already used. Ask {invite.from.first_name} to send you a new one.</p>
            <ButtonLink href={viewer ? "/me" : "/"} variant="glass" className="h-12 text-[16px]">{viewer ? "Go to your profile" : "Open Mixstro"}</ButtonLink>
          </div>
        ) : invite.for_someone_else && viewer ? (
          <p className="text-[15px] text-smoke text-center">This invite was sent to someone else.</p>
        ) : viewer?.profile?.onboarded_at ? (
          <ConfirmSpot token={token} band={invite.band} canDecline={!invite.for_someone_else} />
        ) : (
          <div className="flex flex-col gap-3">
            <ButtonLink href={viewer ? "/onboarding/basics" : "/"} className="h-12 text-[16px]">Join Mixstro to confirm</ButtonLink>
            <p className="text-[13px] text-smoke text-center text-pretty">
              Free. Make your music page with every band you&apos;ve played in, then come back here to confirm. We&apos;ll remember this link.
            </p>
          </div>
        )}

        <Link href={`/@${invite.from.username}`} className="text-[14px] text-smoke underline underline-offset-4 self-center">
          See {invite.from.first_name}&apos;s music page
        </Link>
      </div>
    </main>
  );
}
