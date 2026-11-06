"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdultCheck } from "@/components/adult-check";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, Field } from "@/components/ui";
import { STEP_GLOW, stepNav, useDraft } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";

const nav = stepNav("basics");
const USERNAME = /^[a-z0-9_.]{3,24}$/;

export default function Basics() {
  const router = useRouter();
  const { draft, update, ready } = useDraft();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fromGoogle, setFromGoogle] = useState(false);
  const [taken, setTaken] = useState(false);
  const [askAdult, setAskAdult] = useState(false);
  const username = draft.username.replace(/^@/, "").toLowerCase();
  const usernameOk = USERNAME.test(username);
  const ok = draft.firstName.trim() && usernameOk && !taken && draft.adultConfirmedAt;

  // Google sign-ins arrive with a name and photo; use them as a starting point.
  useEffect(() => {
    if (!ready) return;
    setAskAdult(!draft.adultConfirmedAt);
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const meta = user?.user_metadata ?? {};
      const first = String(meta.given_name ?? meta.full_name ?? meta.name ?? "").trim().split(/\s+/)[0] ?? "";
      const photo = String(meta.avatar_url ?? meta.picture ?? "");
      const patch: Parameters<typeof update>[0] = {};
      if (!draft.firstName && first) patch.firstName = first;
      if (!draft.avatarUrl && photo.startsWith("https://")) {
        // Ask Google for a bigger square than the default 96px thumbnail.
        patch.avatarUrl = photo.replace(/=s\d+-c$/, "=s400-c");
        setFromGoogle(true);
      }
      if (!draft.username && first) patch.username = await freeUsername(first);
      if (Object.keys(patch).length) update(patch);
    });
    // Only on first load: never overwrite what the person typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Check the username isn't already someone else's.
  useEffect(() => {
    setTaken(false);
    if (!usernameOk) return;
    const t = setTimeout(async () => setTaken(!(await isFree(username))), 350);
    return () => clearTimeout(t);
  }, [username, usernameOk]);

  function pickPhoto(file?: File) {
    if (!file) return;
    // Preview only for now; uploading to Supabase Storage happens on finish.
    const reader = new FileReader();
    reader.onload = () => {
      update({ avatarUrl: String(reader.result) });
      setFromGoogle(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="min-h-dvh flex flex-col isolate">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} glow={STEP_GLOW.basics} />
      <StepTitle title="This is you" sub={fromGoogle ? "We brought your name and photo over from Google. Change anything you like." : "Musicians connect faster with a real photo and name."} />
      <div className="px-5 pt-7 flex flex-col gap-5">
        <button type="button" onClick={() => fileRef.current?.click()} className="group flex items-center gap-4 text-left">
          <span className="size-24 rounded-full bg-stage border border-paper/12 overflow-hidden flex items-center justify-center shrink-0 transition group-hover:border-paper/40">
            {draft.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.avatarUrl} alt="Your photo" referrerPolicy="no-referrer" className="size-full object-cover" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-smoke" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            )}
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[16px] font-semibold">{draft.avatarUrl ? "Change photo" : "Add a photo"}</span>
            <span className="text-[13px] text-smoke">
              {fromGoogle ? "This is your Google photo. A shot of you with your instrument works even better." : "A clear photo of you, ideally with your instrument."}
            </span>
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />

        <Field id="first" label="First name" autoComplete="given-name" value={draft.firstName} onChange={(e) => update({ firstName: e.target.value })} />
        <Field
          id="username"
          label="Username"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="@yourname"
          value={draft.username}
          onChange={(e) => update({ username: e.target.value.replace(/\s/g, "") })}
          hint={
            draft.username && !usernameOk
              ? "3 to 24 letters, numbers, dots or underscores."
              : taken
                ? "That one's taken. Try another."
                : undefined
          }
        />
        {/* Shown when the sign-in screen's checkbox didn't carry over, e.g. an email link opened in another browser. */}
        {askAdult && (
          <AdultCheck checked={Boolean(draft.adultConfirmedAt)} onChange={(on) => update({ adultConfirmedAt: on ? new Date().toISOString() : undefined })} />
        )}
      </div>
      <StepFooter>
        <Button disabled={!ok} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}

async function isFree(username: string) {
  const supabase = createClient();
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  return !data || data.id === user?.id;
}

/** "Sundy" → @sundy, or @sundy2, @sundy3… if that's gone. */
async function freeUsername(first: string) {
  const root = first.toLowerCase().normalize("NFKD").replace(/[^a-z0-9_.]/g, "").slice(0, 20).padEnd(3, "_");
  for (const candidate of [root, ...[2, 3, 4, 5, 7, 9].map((n) => `${root}${n}`)]) {
    if (await isFree(candidate)) return candidate;
  }
  return "";
}
