"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui";
import { INSTRUMENTS } from "@/lib/onboarding";
import { createClient, sessionUser } from "@/lib/supabase/client";

const SUGGESTED = ["Drums", "Bass"];

/** #12 Which roles to hear about when one joins nearby. Suggests drums and bass if you're building a band. */
export function AlertRoles() {
  const [roles, setRoles] = useState<string[]>([]);
  const [suggested, setSuggested] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const user = supabase ? await sessionUser(supabase) : null;
      if (supabase && user) {
        const { data } = await supabase.from("profiles").select("alert_roles, goals").eq("id", user.id).maybeSingle<{ alert_roles: string[] | null; goals: string[] }>();
        if (data?.alert_roles) setRoles(data.alert_roles);
        else if (data?.goals?.includes("start_project")) {
          setRoles(SUGGESTED);
          setSuggested(true);
        }
      }
      setReady(true);
    })();
  }, []);

  async function toggle(role: string) {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    setRoles(next);
    setSuggested(false);
    setError(undefined);
    const supabase = createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!supabase || !user) return;
    const { error } = await supabase.from("profiles").update({ alert_roles: next }).eq("id", user.id);
    if (error) setError("That didn't save. Try again.");
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold">Who you&apos;re looking for</h2>
        <p className="text-[14px] text-smoke text-pretty">
          When one of these joins within your radius and likes some of the same music, it shows at the top of Today.
          {suggested ? " We picked drums and bass because you're building a band." : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {INSTRUMENTS.map((i) => (
          <Chip key={i} selected={roles.includes(i)} disabled={!ready} onClick={() => toggle(i)}>
            {i}
          </Chip>
        ))}
      </div>
      {error && <p className="text-[13px] text-[#FF453A]">{error}</p>}
    </section>
  );
}
