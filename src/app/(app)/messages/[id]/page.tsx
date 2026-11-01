import Link from "next/link";
import { notFound } from "next/navigation";
import { getChat } from "@/lib/people";
import { ChatHeader } from "./chat-header";
import { DemoChat } from "./demo-chat";
import { LiveChat } from "./live-chat";

export const dynamic = "force-dynamic";

export default async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await getChat(id);
  if (!chat) notFound();
  if (chat.kind === "demo") return <DemoChat person={chat.person} />;
  if (chat.kind === "live") return <LiveChat person={chat.person} connectionId={chat.connectionId} messages={chat.messages} />;

  const first = chat.person.name.split(" ")[0];
  const sent = chat.connection?.from_id === chat.viewerId && chat.connection.status === "pending";
  return (
    <main className="relative h-dvh md:h-full flex flex-col">
      <ChatHeader person={chat.person} action={false} />
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
        <h1 className="text-[20px] font-semibold">{sent ? `Waiting on ${first}` : `Connect with ${first} first`}</h1>
        <p className="text-[15px] leading-[1.5] text-smoke">
          {sent
            ? `Your chat opens as soon as ${first} connects back.`
            : `Chats open once you both Connect, so nobody gets messages they didn't ask for.`}
        </p>
        {!sent && (
          <Link href={`/m/${chat.person.username}`} className="mt-3 h-11 px-5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center">
            See {first}&apos;s profile
          </Link>
        )}
      </div>
    </main>
  );
}
