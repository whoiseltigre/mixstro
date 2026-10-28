"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { StepFooter, StepHeader, StepTitle } from "@/components/step-header";
import { Button, Field } from "@/components/ui";
import { isAdult, stepNav, useDraft } from "@/lib/onboarding";

const nav = stepNav("basics");

export default function Basics() {
  const router = useRouter();
  const { draft, update } = useDraft();
  const fileRef = useRef<HTMLInputElement>(null);
  const username = draft.username.replace(/^@/, "");
  const usernameOk = /^[a-z0-9_.]{3,24}$/i.test(username);
  const tooYoung = Boolean(draft.birthday) && !isAdult(draft.birthday);
  const ok = draft.firstName.trim() && usernameOk && isAdult(draft.birthday);

  function pickPhoto(file?: File) {
    if (!file) return;
    // Preview only for now; uploading to Supabase Storage happens on finish.
    const reader = new FileReader();
    reader.onload = () => update({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <StepHeader step={nav.number} total={nav.total} back={nav.back} />
      <StepTitle title="Set up your profile" sub="Musicians connect faster with a real photo and name." />
      <div className="px-5 pt-7 flex flex-col gap-5">
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-4 text-left">
          <span className="size-24 rounded-full bg-stage border border-paper/12 overflow-hidden flex items-center justify-center shrink-0">
            {draft.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.avatarUrl} alt="Your photo" className="size-full object-cover" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-smoke" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            )}
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[16px] font-semibold">{draft.avatarUrl ? "Change photo" : "Add a photo"}</span>
            <span className="text-[13px] text-smoke">A clear photo of you, ideally with your instrument.</span>
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
          hint={draft.username && !usernameOk ? "3 to 24 letters, numbers, dots or underscores." : undefined}
        />
        <Field
          id="birthday"
          label="Birthday"
          type="date"
          autoComplete="bday"
          value={draft.birthday}
          onChange={(e) => update({ birthday: e.target.value })}
          hint={tooYoung ? "Mixstro is for musicians 18 and older." : "You must be 18 or older. Only your age range is shown."}
        />
      </div>
      <StepFooter>
        <Button disabled={!ok} onClick={() => router.push(nav.next)}>
          Continue
        </Button>
      </StepFooter>
    </main>
  );
}
