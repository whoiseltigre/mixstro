import { ActivityPing } from "@/components/activity";
import { PushPrompt } from "@/components/push-prompt";
import { TabBar } from "@/components/tab-bar";
import { TopBar } from "@/components/top-bar";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/people";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Signed in but no finished profile: signup comes first, however they got here
  // (an old account, a sign-in link that came back to the plain address, a bookmark).
  const viewer = await getViewer();
  if (viewer && !viewer.profile?.onboarded_at) redirect("/onboarding/who");
  return (
    // Phones: one column with the bottom tab bar. From 768px: the glass bar moves to the top and pages use the width.
    <div className="isolate relative min-h-dvh w-full mx-auto max-w-[560px] md:max-w-[1440px] md:px-10 md:pt-[88px]">
      <TopBar />
      {children}
      <TabBar />
      <ActivityPing />
      <PushPrompt />
    </div>
  );
}
