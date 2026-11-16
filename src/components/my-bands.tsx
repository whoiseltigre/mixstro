"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { startBand } from "@/app/(app)/bands/actions";
import { FadeImg } from "@/components/fade-image";
import { toast } from "@/components/toast";
import { artworkOf, isCurrent, nameWash, type Project } from "@/lib/projects";

/**
 * On your profile: each band you play in now, with a way into Your band. A current project
 * that isn't a band yet gets "Make it a band page".
 */
export function MyBands({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Saved projects only (a draft that is only on this device has no id yet).
  const current = projects.filter((p) => isCurrent(p) && (p.bandId || /^\d+$/.test(p.id)));
  if (!current.length) return null;

  return (
    <section className="flex flex-col gap-2" aria-label="Your bands">
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">{current.length === 1 ? "Your band" : "Your bands"}</h2>
      <ul className="rounded-[22px] bg-stage divide-y divide-paper/8 overflow-hidden">
        {current.map((p) => {
          const art = artworkOf(p);
          const body = (
            <>
              <span className="relative size-12 rounded-[14px] overflow-hidden shrink-0" style={{ background: nameWash(p.name) }}>
                {art && <FadeImg src={art} alt="" className="absolute inset-0 size-full object-cover" />}
              </span>
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-[16px] font-semibold truncate">{p.name}</span>
                <span className="text-[13px] text-smoke truncate">{p.bandId ? "Chat, shows, open spots, page" : "Not a band page yet"}</span>
              </span>
            </>
          );
          const cls = "w-full flex items-center gap-3.5 px-3.5 py-3 text-left transition hover:bg-paper/4";
          return (
            <li key={p.id}>
              {p.bandId ? (
                <Link href={`/bands/${p.bandId}`} className={cls}>
                  {body}
                  <span className="h-8 px-3.5 rounded-full glass text-[13px] font-semibold flex items-center shrink-0">Open</span>
                </Link>
              ) : (
                <div className={cls}>
                  {body}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await startBand(p.id);
                        if (res.error || !res.id) {
                          toast(res.error ?? "That didn't work. Try again.");
                          return;
                        }
                        router.push(`/bands/${res.id}`);
                      })
                    }
                    className="h-8 px-3.5 rounded-full bg-paper text-ink text-[13px] font-semibold shrink-0 disabled:opacity-50"
                  >
                    Make a band page
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
