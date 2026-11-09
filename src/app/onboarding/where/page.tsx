import { redirect } from "next/navigation";

// "Where are you based?" now sits on the first step; old links land there.
export default function Where() {
  redirect("/onboarding/basics");
}
