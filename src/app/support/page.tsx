import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Help and support · Mixstro",
  description: "Get help with Mixstro: signing in, your profile, notifications, safety and deleting your account.",
};

// The support page the App Store and Google Play listings link to.
export default function SupportPage() {
  return (
    <LegalPage title="Help and support" updated="November 28, 2026">
      <p>
        Stuck on something, or found a bug? Email <a href="mailto:hello@mixstro.com">hello@mixstro.com</a> and a real person
        will get back to you, usually within a day.
      </p>
      <section>
        <h2>Signing in</h2>
        <p>
          Sign in with Apple, Google or your email. With email, we send a 6-digit code; if it hasn&apos;t arrived within a
          minute, check your spam folder or ask for a new one.
        </p>
      </section>
      <section>
        <h2>Notifications</h2>
        <p>
          Turn them on in Settings, then Notifications. In the iPhone or Android app, if you said no the first time, turn them on
          for Mixstro in your phone&apos;s Settings app as well.
        </p>
      </section>
      <section>
        <h2>Safety</h2>
        <p>
          Every profile and message has Report and Block. Blocking stops someone from finding or messaging you. Reports go to a
          person on our team; for anything urgent, email <a href="mailto:hello@mixstro.com">hello@mixstro.com</a> too.
        </p>
      </section>
      <section>
        <h2>Your account and data</h2>
        <p>
          Edit your profile any time. To delete your account and everything in it, see{" "}
          <a href="/delete-account">how to delete your account</a>. For privacy questions, read the{" "}
          <a href="/privacy">privacy policy</a> or email privacy@mixstro.com.
        </p>
      </section>
    </LegalPage>
  );
}
