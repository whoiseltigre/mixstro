import { FlowShell } from "@/components/flow-shell";
import { MotionProvider } from "@/components/motion-provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <FlowShell>
      {children}
      <MotionProvider />
    </FlowShell>
  );
}
