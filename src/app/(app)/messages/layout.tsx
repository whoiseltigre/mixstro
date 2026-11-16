import { getMyBands } from "@/lib/band-hub";
import { getThreads } from "@/lib/people";
import { MessagesShell, ThreadList } from "./thread-list";

export const dynamic = "force-dynamic";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const [{ threads }, bands] = await Promise.all([getThreads(), getMyBands()]);
  return <MessagesShell list={<ThreadList threads={threads} bands={bands} />}>{children}</MessagesShell>;
}
