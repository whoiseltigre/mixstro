import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { artistTint } from "@/lib/artists";
import { getProfile } from "@/lib/people";

export const dynamic = "force-dynamic";

/** Shown when both musicians said yes: the overlap of your sound and theirs. */
export default async function Connected({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const view = await getProfile(username);
  if (!view) notFound();
  const { person: m, viewerPhoto } = view;
  const first = m.name.split(" ")[0];
  const overlap = m.distanceMi
    ? `You're ${m.distanceMi} miles apart and both ${m.commitment.toLowerCase()}.`
    : m.sameCommitment
      ? `You're both ${m.commitment.toLowerCase()}.`
      : `${first} plays ${m.instrument.toLowerCase()} around ${m.neighborhood}.`;

  return (
    <main className="relative min-h-dvh md:min-h-[calc(100dvh-88px)] flex flex-col px-5 pt-safe pb-safe overflow-hidden md:max-w-[560px] md:mx-auto">
      <div aria-hidden="true" className="absolute left-1/2 top-[190px] -translate-x-1/2 w-[200px] h-[240px] rounded-full opacity-25 blur-[70px]" style={{ background: "var(--gel)" }} />
      <div className="relative flex items-center justify-between h-12 mt-2">
        <span className="text-[13px] font-medium text-smoke">New collaboration</span>
        <Link href="/discover" aria-label="Close" className="glass size-11 rounded-full flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
      </div>

      <svg viewBox="0 0 350 250" role="img" aria-label={`Your sound and ${first}'s overlap on ${m.shared.length} shared influences`} className="relative w-[88%] mx-auto mt-2">
        <defs>
          <clipPath id="ca"><circle cx="118" cy="125" r="112" /></clipPath>
          <clipPath id="cb"><circle cx="232" cy="125" r="112" /></clipPath>
          <linearGradient id="you-tint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4A4541" /><stop offset="1" stopColor="#1A1816" />
          </linearGradient>
          <linearGradient id="gel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F7BF77" /><stop offset="0.35" stopColor="#FFACBA" /><stop offset="0.7" stopColor="#B5C5FF" /><stop offset="1" stopColor="#67E2DA" />
          </linearGradient>
        </defs>
        {viewerPhoto ? (
          <image href={viewerPhoto} x="6" y="13" width="224" height="224" preserveAspectRatio="xMidYMin slice" clipPath="url(#ca)" style={{ filter: "grayscale(1) brightness(0.8)" }} />
        ) : (
          <circle cx="118" cy="125" r="112" fill="url(#you-tint)" />
        )}
        {m.photo ? (
          <image href={m.photo} x="120" y="13" width="224" height="224" preserveAspectRatio="xMidYMid slice" clipPath="url(#cb)" style={{ filter: "grayscale(1) brightness(0.8)" }} />
        ) : (
          <foreignObject x="120" y="13" width="224" height="224" clipPath="url(#cb)">
            <div style={{ width: "100%", height: "100%", background: artistTint(m.id) }} />
          </foreignObject>
        )}
        <g clipPath="url(#ca)"><circle cx="232" cy="125" r="112" fill="url(#gel)" opacity="0.92" /></g>
        <circle cx="118" cy="125" r="112" fill="none" stroke="rgb(245 241 236 / 0.35)" strokeWidth="1.5" />
        <circle cx="232" cy="125" r="112" fill="none" stroke="rgb(245 241 236 / 0.35)" strokeWidth="1.5" />
        <text x="175" y="128" textAnchor="middle" fill="#0F0D0B" className="headline" fontSize="46">{m.shared.length}</text>
        <text x="175" y="150" textAnchor="middle" fill="#0F0D0B" fontSize="12" fontWeight="600">in common</text>
        <text x="62" y="222" textAnchor="middle" fill="#F5F1EC" fontSize="13" fontWeight="600">You</text>
        <text x="288" y="222" textAnchor="middle" fill="#F5F1EC" fontSize="13" fontWeight="600">{first}</text>
      </svg>

      <div className="relative mt-4 flex flex-col items-center gap-3 text-center">
        <h1 className="headline text-[40px] leading-none">Time to make<br />something.</h1>
        <p className="text-[15px] leading-[1.5] text-smoke">
          {first} is in too. {overlap}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {m.shared.map((a) => (
            <span key={a.id} className="text-[13px] px-3 py-1.5 rounded-full bg-paper/8 border border-paper/12">{a.name}</span>
          ))}
        </div>
      </div>

      <div className="relative mt-auto pt-8 flex flex-col gap-2.5">
        <div className="gel-rim rounded-full">
          <Link href={`/messages/${m.username}`} className="h-[53px] rounded-full bg-paper text-ink text-[17px] font-semibold flex items-center justify-center gap-2">
            Plan a jam session
          </Link>
        </div>
        <ButtonLink variant="glass" href={`/messages/${m.username}`}>Send {first} a demo</ButtonLink>
      </div>
    </main>
  );
}
