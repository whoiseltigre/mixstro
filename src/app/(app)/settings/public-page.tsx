"use client";

import { useEffect, useState } from "react";
import { createClient, sessionUser } from "@/lib/supabase/client";
import { Toggle } from "@/components/ui";

/** On by default: your music page opens for anyone with the link, signed in or not. */
export function PublicPageToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return setOn(true);
    sessionUser(supabase).then(async (user) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("public_page").eq("id", user.id).maybeSingle<{ public_page: boolean }>();
      setOn(data?.public_page ?? true);
    });
  }, []);

  async function flip() {
    const next = !on;
    setOn(next);
    setError(false);
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user ? await supabase.from("profiles").update({ public_page: next }).eq("id", user.id) : { error: true };
    if (error) {
      setOn(!next);
      setError(true);
    }
  }

  return (
    <section className="flex items-center gap-3 p-4 rounded-card bg-stage">
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="text-callout font-semibold">Public music page</span>
        <span className="text-footnote text-smoke text-pretty">
          {error ? "That didn't save. Try again." : "Anyone with your link can see your bands and play your tracks, even without an account. Turn off to show your profile to members only."}
        </span>
      </span>
      <Toggle on={Boolean(on)} onChange={flip} label="Public music page" disabled={on === null} />
    </section>
  );
}

/**
 * Off by default: anyone who has a song can Connect. On: only musicians with a verified
 * account can. Hidden until the database has the setting.
 */
export function VerifiedOnlyToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return setMissing(true);
    sessionUser(supabase).then(async (user) => {
      if (!user) return;
      const { data, error } = await supabase.from("profiles").select("connect_verified_only").eq("id", user.id).maybeSingle<{ connect_verified_only: boolean }>();
      if (error) return setMissing(true);
      setOn(data?.connect_verified_only ?? false);
    });
  }, []);

  async function flip() {
    const next = !on;
    setOn(next);
    setError(false);
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user ? await supabase.from("profiles").update({ connect_verified_only: next }).eq("id", user.id) : { error: true };
    if (error) {
      setOn(!next);
      setError(true);
    }
  }

  if (missing) return null;
  return (
    <section className="flex items-center gap-3 p-4 rounded-card bg-stage">
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="text-callout font-semibold">Only verified musicians can Connect</span>
        <span className="text-footnote text-smoke text-pretty">
          {error ? "That didn't save. Try again." : "Turn on to only get Connects from people with a verified account. Bandmates and people you already know can still reach you."}
        </span>
      </span>
      <Toggle on={Boolean(on)} onChange={flip} label="Only verified musicians can Connect" disabled={on === null} />
    </section>
  );
}
