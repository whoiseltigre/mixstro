import type { Metadata } from "next";
import { StatusPage } from "@/components/status-page";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found · Mixstro" };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="This page missed its cue."
      actions={
        <ButtonLink href="/" className="sm:flex-1">
          Back to Mixstro
        </ButtonLink>
      }
    >
      <p>The link might be old, or the page moved. Let&apos;s get you back on stage.</p>
    </StatusPage>
  );
}
