import { ActivityPing } from "@/components/activity";
import { TabBar } from "@/components/tab-bar";
import { TopBar } from "@/components/top-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Phones: one column with the bottom tab bar. From 768px: the glass bar moves to the top and pages use the width.
    <div className="isolate relative min-h-dvh w-full mx-auto max-w-[560px] md:max-w-[1440px] md:px-10 md:pt-[88px]">
      <TopBar />
      {children}
      <TabBar />
      <ActivityPing />
    </div>
  );
}
