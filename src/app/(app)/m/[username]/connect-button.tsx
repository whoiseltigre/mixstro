"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { connect } from "../../actions";

export function ConnectButton({ id, username, label }: { id: string; username: string; label: string }) {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Button
      className="h-12 text-[16px]"
      disabled={pending || sent}
      onClick={() =>
        start(async () => {
          const res = await connect(id, username);
          if (res?.sent) setSent(true);
        })
      }
    >
      {sent ? "Request sent" : label}
    </Button>
  );
}
