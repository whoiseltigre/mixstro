import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy · Mixstro" };

// Plain-language draft. Have it reviewed before public launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 29, 2026">
      <p>Mixstro helps musicians find each other. This page explains what we collect, why, and the choices you have.</p>
      <section>
        <h2>What we collect</h2>
        <p>
          Your email address, or your name and email from Google if you sign in with Google. The profile you build: first name,
          username, birthday (to confirm you are 18 or older), photo, instruments, genres, influences, goals, general area, and
          the links you add to your clips. Messages and connection requests you send, and basic usage data such as when you were
          last active.
        </p>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>
          To run your account, suggest musicians you might want to play with, show your profile to other members, deliver your
          messages, keep Mixstro safe, and send sign-in codes. We do not sell your personal information.
        </p>
      </section>
      <section>
        <h2>What other members see</h2>
        <p>
          Your profile is visible to signed-in members once you finish setting it up. We show your general area, never your exact
          location. Your birthday and email are never shown. Messages are visible only to the people in the conversation.
        </p>
      </section>
      <section>
        <h2>Services we rely on</h2>
        <p>
          We store data with Supabase, send email through Resend, and offer sign-in with Google. Clips you add are played through
          the platform they come from (for example YouTube, TikTok, Instagram, SoundCloud, Spotify, or Apple Music), which may set
          its own cookies under its own policy.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can edit your profile at any time. You can ask us to export or delete your account and data by emailing
          privacy@mixstro.com.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions? Email privacy@mixstro.com.</p>
      </section>
    </LegalPage>
  );
}
