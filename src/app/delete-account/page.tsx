import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Delete your account · Mixstro",
  description: "How to delete your Mixstro account and everything in it.",
};

// The public page app stores ask for: how to delete an account, reachable without the app.
export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your account" updated="November 20, 2026">
      <p>You can delete your Mixstro account at any time, from the app or from the web.</p>
      <section>
        <h2>How</h2>
        <p>
          Sign in at <a href="https://app.mixstro.com/settings">app.mixstro.com</a>, open Settings, and choose Delete account.
          It&apos;s the same in the installed app. Can&apos;t sign in? Email privacy@mixstro.com from the address on your account
          and we&apos;ll delete it for you.
        </p>
      </section>
      <section>
        <h2>What gets deleted</h2>
        <p>
          Your profile, photos, clips and tracks, influences, projects, Board posts and answers, connections, messages and voice
          notes (including voice notes in chats with you), band chat messages, notification settings and devices. Chats you were
          in disappear for the other person too.
        </p>
      </section>
      <section>
        <h2>What stays</h2>
        <p>
          Bands keep the band photo you uploaded for them. Reports you filed about other people stay, without your name, so our
          safety team can act on them. A record that your account was deleted, and when, is kept with no personal details.
        </p>
      </section>
      <section>
        <h2>How long it takes</h2>
        <p>Right away. If anything interrupts it, we finish it automatically within the hour.</p>
      </section>
    </LegalPage>
  );
}
