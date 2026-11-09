"use client";

import { useState, useTransition } from "react";
import { announceConnect } from "@/components/push-prompt";
import { Button } from "@/components/ui";
import { connect } from "../../actions";

export function ConnectButton({ id, username, label, firstName }: { id: string; username: string; label: string; firstName?: string }) {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Button
      className="h-12 text-[16px]"
      disabled={pending || sent}
      onClick={() =>
        start(async () => {
          const res = await connect(id, username);
          if (res?.sent) {
            setSent(true);
            announceConnect(firstName);
          }
        })
      }
    >
      {sent ? "Request sent" : label}
    </Button>
  );
}
