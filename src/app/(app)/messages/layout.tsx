import { getThreads } from "@/lib/people";
import { MessagesShell, ThreadList } from "./thread-list";

export const dynamic = "force-dynamic";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { threads } = await getThreads();
  return <MessagesShell list={<ThreadList threads={threads} />}>{children}</MessagesShell>;
}
