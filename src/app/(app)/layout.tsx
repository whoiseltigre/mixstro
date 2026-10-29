import { ActivityPing } from "@/components/activity";
import { TabBar } from "@/components/tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TabBar />
      <ActivityPing />
    </>
  );
}
