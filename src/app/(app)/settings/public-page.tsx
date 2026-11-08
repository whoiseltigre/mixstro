"use client";

import { useEffect, useState } from "react";
import { createClient, sessionUser } from "@/lib/supabase/client";

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
    <section className="flex items-center gap-3 p-4 rounded-[20px] bg-stage">
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">Public music page</span>
        <span className="text-[13px] text-smoke text-pretty">
          {error ? "That didn't save. Try again." : "Anyone with your link can see your bands and play your tracks, even without an account. Turn off to show your profile to members only."}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(on)}
        aria-label="Public music page"
        disabled={on === null}
        onClick={flip}
        className={`relative w-[51px] h-[31px] rounded-full shrink-0 transition ${on ? "bg-[#30D158]" : "bg-paper/16"} disabled:opacity-40`}
      >
        <span className={`absolute top-[2px] size-[27px] rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-[2px]"}`} />
      </button>
    </section>
  );
}
