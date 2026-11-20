"use client";

import { useState, useTransition } from "react";
import { ConnectSheet, type ConnectPerson } from "@/components/connect-sheet";
import { announceConnect } from "@/components/push-prompt";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { connect } from "../../actions";

/**
 * Connect from a profile or your network. A new Connect opens the note sheet; when they
 * already asked you (`asked`), it connects straight away and opens the chat.
 */
export function ConnectButton({
  person,
  label,
  asked,
  className = "h-12 text-body",
}: {
  person: ConnectPerson;
  label: string;
  asked?: boolean;
  className?: string;
}) {
  const first = person.name.split(" ")[0];
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const accept = () => {
    // Shows as sent straight away; only a failure takes it back.
    setSent(true);
    start(async () => {
      try {
        const res = await connect(person.id, person.username);
        if (res && "sent" in res && res.sent) announceConnect(first);
        else if (res && "error" in res) {
          setSent(false);
          toast(res.error);
        }
      } catch (e) {
        if (isRedirect(e)) throw e; // they'd already asked you: off to the new conversation
        setSent(false);
        toast("That didn't send. Check your connection and try again.");
      }
    });
  };

  return (
    <>
      <Button className={className} disabled={pending || sent} onClick={() => (asked ? accept() : setOpen(true))}>
        {sent ? "Request sent" : label}
      </Button>
      {open && (
        <ConnectSheet
          person={person}
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setSent(true);
            announceConnect(first);
          }}
        />
      )}
    </>
  );
}

/** Next.js signals a server-side redirect by throwing; let those through. */
function isRedirect(e: unknown) {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
