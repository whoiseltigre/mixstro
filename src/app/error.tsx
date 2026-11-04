"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/status-page";
import { Button, ButtonLink } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="Oops"
      title="Something went out of tune."
      actions={
        <>
          <Button onClick={reset} className="sm:flex-1">
            Try again
          </Button>
          <ButtonLink href="/" variant="glass" className="sm:flex-1">
            Go home
          </ButtonLink>
        </>
      }
    >
      <p>That one&apos;s on us. Try again, and if it keeps happening, reload the page in a minute.</p>
    </StatusPage>
  );
}
