"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { myBandInvites, type BandInvite } from "@/lib/bands";
import { createClient } from "@/lib/supabase/client";

/** Bandmate tags waiting on you, at the top of your profile. */
export function BandInvites() {
  const [invites, setInvites] = useState<BandInvite[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) setInvites(await myBandInvites(supabase, user.id));
    });
  }, []);

  if (!invites.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Bands waiting on you">
      {invites.map((i) => (
        <Link key={i.token} href={`/join/${i.token}`} className="gel-rim rounded-[20px] block">
          <span className="rounded-[18.5px] bg-stage flex items-center gap-3 p-3.5">
            <span className="relative size-11 rounded-full overflow-hidden bg-riser shrink-0">
              {i.from.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.from.avatar_url} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
              )}
            </span>
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-[15px] font-semibold">{i.from.first_name} added you to {i.band}</span>
              <span className="text-[13px] text-smoke">Confirm your spot so it shows on your profile</span>
            </span>
            <span aria-hidden="true" className="text-smoke">›</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
