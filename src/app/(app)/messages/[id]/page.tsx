import Link from "next/link";
import { notFound } from "next/navigation";
import { getChat, isExpired } from "@/lib/people";
import { ChatHeader } from "./chat-header";
import { DemoChat } from "./demo-chat";
import { LiveChat } from "./live-chat";

export const dynamic = "force-dynamic";

export default async function Chat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await getChat(id);
  if (!chat) notFound();
  if (chat.kind === "demo") return <DemoChat person={chat.person} />;
  if (chat.kind === "live") return <LiveChat person={chat.person} connectionId={chat.connectionId} messages={chat.messages} jams={chat.jams} />;

  const first = chat.person.name.split(" ")[0];
  const c = chat.connection;
  const mineOut = c?.from_id === chat.viewerId;
  const expired = c?.status === "pending" && isExpired(c.created_at);
  const declined = mineOut && c?.status === "declined";
  const sent = mineOut && c?.status === "pending" && !expired;
  if (declined || (mineOut && expired)) {
    return (
      <main className="relative h-dvh md:h-full flex flex-col">
        <ChatHeader person={chat.person} action={false} />
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <h1 className="text-[20px] font-semibold">{declined ? "Not the right fit this time" : "This Connect closed"}</h1>
          <p className="text-[15px] leading-[1.5] text-smoke">
            {declined
              ? `${first} passed, kindly. Plenty more musicians on Today and the Board.`
              : `${first} didn't answer within a week, so it closed for both of you. No hard feelings.`}
          </p>
          <Link href="/discover" className="mt-3 h-11 px-5 rounded-full bg-paper text-ink text-[15px] font-semibold flex items-center">
            See Today
          </Link>
        </div>
      </main>
    );
  }
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
