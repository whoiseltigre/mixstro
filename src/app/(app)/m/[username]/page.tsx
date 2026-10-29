import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityBadge } from "@/components/activity";
import { ArtistAvatar } from "@/components/artist-avatar";
import { ProjectList } from "@/components/project-list";
import { PersonPhoto } from "@/components/person-photo";
import { SafetyMenu } from "@/components/safety-menu";
import { BackButton, Button, ButtonLink, VerifiedMark } from "@/components/ui";
import { getProjects } from "@/lib/projects-server";
import { getProfile } from "@/lib/people";
import { ConnectButton } from "./connect-button";

export const dynamic = "force-dynamic";

export default async function Profile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const view = await getProfile(username);
  if (!view) notFound();
  const { person: m, connection, viewerId } = view;
  const first = m.name.split(" ")[0];
  const projects = await getProjects(m);
  const sharedIds = new Set(m.shared.map((a) => a.id));
  const status = !connection
    ? "none"
    : connection.status === "accepted"
      ? "connected"
      : connection.status === "passed"
        ? "passed"
        : connection.from_id === viewerId
          ? "sent"
          : "asked";

  return (
    <main className="pb-16">
      <div className="relative h-[330px]">
        <PersonPhoto person={m} priority sizes="440px" initialsSize={88} className="object-[50%_40%]" />
        <div className="absolute inset-x-0 bottom-0 h-[170px] bg-gradient-to-b from-ink/0 to-ink" />
        <div className="absolute inset-x-5 top-0 pt-safe mt-2 flex justify-between">
          <BackButton href="/discover" />
          {!m.sample && <SafetyMenu username={m.username} name={m.name} />}
        </div>
      </div>

      <div className="relative -mt-20 px-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold tracking-[0.16em] uppercase text-smoke">
            {m.instrument} · {m.genres} · {m.neighborhood}
          </span>
          <h1 className="headline text-[44px] leading-[0.98] flex items-center gap-2">
            {m.name}
            {m.verified && <VerifiedMark size={26} className="text-paper" />}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap text-[13px]">
          <span className="px-3 py-1.5 rounded-full border border-paper/16">{m.lookingFor}</span>
          {m.sample ? (
            <span className="px-3 py-1.5 rounded-full border border-paper/16">Active this week</span>
          ) : (
            m.lastActiveAt && <ActivityBadge lastActiveAt={m.lastActiveAt} className="px-3 py-1.5 rounded-full border border-paper/16" />
          )}
        </div>
        <div className="flex gap-2.5">
          {status === "connected" ? (
            <ButtonLink href={`/messages/${m.username}`} className="h-12 text-[16px]">Message {first}</ButtonLink>
          ) : status === "sent" ? (
            <Button disabled className="h-12 text-[16px]">Request sent</Button>
          ) : status === "passed" ? null : (
            <ConnectButton id={m.id} username={m.username} label={status === "asked" ? `Connect with ${first}` : "Connect"} />
          )}
          {(!viewerId || m.sample) && (
            <ButtonLink href={`/messages/${m.username}`} variant="glass" className="h-12 text-[16px]">Message</ButtonLink>
          )}
        </div>

        {projects.length > 0 && (
          <div className="pt-3">
            <ProjectList projects={projects} />
          </div>
        )}

        <section className="flex flex-col gap-2.5 pt-2">
          <div className="flex justify-between items-baseline">
            <h2 className="text-[17px] font-semibold">Influences</h2>
            <span className="text-[13px] text-smoke">{m.shared.length} shared</span>
          </div>
          <div className="hscroll flex gap-4 -mx-5 px-5">
            {m.influences.map((a) => {
              const shared = sharedIds.has(a.id);
              return (
                <div key={a.id} className="w-[88px] shrink-0 flex flex-col items-center gap-2">
                  <span className="rounded-full p-[2px]" style={{ background: shared ? "var(--gel)" : "transparent" }}>
                    <span className="block rounded-full border-2 border-ink">
                      <ArtistAvatar artist={a} size={80} />
                    </span>
                  </span>
                  <span className="flex flex-col items-center w-full">
                    <span className="text-[13px] font-semibold truncate max-w-full">{a.name}</span>
                    <span className="text-[12px] text-smoke">{shared ? "Shared" : "Artist"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {m.sample && (
          <p className="pt-2 text-[13px] text-smoke">
            Sample profile. <Link href="/discover" className="underline">Back to Today</Link>
          </p>
        )}
      </div>
    </main>
  );
}
