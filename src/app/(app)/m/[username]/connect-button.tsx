"use client";

import { useState, useTransition } from "react";
import { ConnectSheet } from "@/components/connect-sheet";
import { announceConnect } from "@/components/push-prompt";
import { Button } from "@/components/ui";
import type { Musician } from "@/lib/mock";
import { connect } from "../../actions";

/**
 * Connect from a profile. A new Connect opens the note sheet; when they already asked
 * you (`asked`), it connects straight away and opens the chat.
 */
export function ConnectButton({ person, label, asked }: { person: Musician; label: string; asked?: boolean }) {
  const first = person.name.split(" ")[0];
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        className="h-12 text-[16px]"
        disabled={pending || sent}
        onClick={() =>
          asked
            ? start(async () => {
                const res = await connect(person.id, person.username);
                if (res && "sent" in res && res.sent) {
                  setSent(true);
                  announceConnect(first);
                }
              })
            : setOpen(true)
        }
      >
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
