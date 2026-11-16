import { notFound } from "next/navigation";
import { getBandChat } from "@/lib/band-hub";
import { BandChatView } from "./band-chat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Band chat · Mixstro" };

/** A band's group chat: everyone who plays in it now. */
export default async function BandChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await getBandChat(id);
  if (!chat) notFound();
  return <BandChatView chat={chat} />;
}
