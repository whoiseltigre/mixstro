import { ActivityPing } from "@/components/activity";
import { TabBar } from "@/components/tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // The tabs are still a phone-width column on every screen; a desktop layout for them is a separate pass.
    <div className="mx-auto min-h-dvh w-full max-w-[440px] relative">
      {children}
      <TabBar />
      <ActivityPing />
    </div>
  );
}
