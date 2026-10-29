import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service · Mixstro" };

// Plain-language draft. Have it reviewed before public launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 29, 2026">
      <p>By creating a Mixstro account you agree to these terms.</p>
      <section>
        <h2>Who can use Mixstro</h2>
        <p>You must be 18 or older. One account per person, and the details on your profile should be your own and accurate.</p>
      </section>
      <section>
        <h2>Be a good bandmate</h2>
        <p>
          No harassment, hate, spam, scams, or sexual content. Don&apos;t impersonate anyone. Only post clips and music you have
          the right to share. We may remove content or suspend accounts that break these rules.
        </p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>
          You own what you post. You give Mixstro permission to display it inside the service so other members can see your
          profile, clips, and posts. You can remove it at any time.
        </p>
      </section>
      <section>
        <h2>Meeting up</h2>
        <p>
          Mixstro introduces musicians; we don&apos;t vet members or supervise jams, sessions, or gigs. Meet in public or
          professional spaces, and use your judgment.
        </p>
      </section>
      <section>
        <h2>The service</h2>
        <p>
          Mixstro is provided as is. We may change or pause features. You can stop using Mixstro and delete your account at any
          time, and we may update these terms with notice in the app.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions? Email hello@mixstro.com.</p>
      </section>
    </LegalPage>
  );
}
