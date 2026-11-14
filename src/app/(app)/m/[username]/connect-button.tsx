"use client";

import { useState, useTransition } from "react";
import { announceConnect } from "@/components/push-prompt";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { connect } from "../../actions";

export function ConnectButton({ id, username, label, firstName, className = "h-12 text-[16px]" }: { id: string; username: string; label: string; firstName?: string; className?: string }) {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Button
      className={className}
      disabled={pending || sent}
      onClick={() => {
        // Shows as sent straight away; only a failure takes it back.
        setSent(true);
        start(async () => {
          try {
            const res = await connect(id, username);
            if (res?.sent) announceConnect(firstName);
          } catch (e) {
            if (isRedirect(e)) throw e; // they'd already asked you: off to the new conversation
            setSent(false);
            toast("That didn't send. Check your connection and try again.");
          }
        });
      }}
    >
      {sent ? "Request sent" : label}
    </Button>
  );
}

/** Next.js signals a server-side redirect by throwing; let those through. */
function isRedirect(e: unknown) {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
