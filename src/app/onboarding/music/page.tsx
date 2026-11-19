import { redirect } from "next/navigation";

// "Connect your music" used to pretend to read Apple Music or Spotify and filled in sample artists.
// Real sign-in needs an Apple developer account (and Spotify caps new apps at five users), so
// until then influences are picked by hand. Old links land on that step.
export default function ConnectMusic() {
  redirect("/onboarding/influences");
}
