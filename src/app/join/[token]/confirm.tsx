"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";
import { confirmSpot, declineSpot } from "../actions";

export function ConfirmSpot({ token, band, canDecline }: { token: string; band: string; canDecline: boolean }) {
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await confirmSpot(token, role);
        setBusy(false);
        if (res?.error) setError(res.error);
      }}
    >
      <Field id="role" label={`What did you play in ${band}?`} value={role} maxLength={80} onChange={(e) => setRole(e.target.value)} placeholder="Bass, vocals" />
      <Button type="submit" disabled={busy} className="h-12 text-[16px]">
        {busy ? "Confirming…" : "Confirm your spot"}
      </Button>
      {canDecline && (
        <button type="button" onClick={() => declineSpot(token)} className="text-[14px] text-smoke underline underline-offset-4 self-center">
          I wasn&apos;t in this band
        </button>
      )}
      {error && <p role="alert" className="text-[13px] text-[#FF453A] text-center">{error}</p>}
    </form>
  );
}
