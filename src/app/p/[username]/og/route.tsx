import { previewCard } from "@/lib/share-cards";
import { getPublicPage } from "@/lib/public-profile";
import { requestOrigin } from "@/lib/origin";

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const page = await getPublicPage(username);
  if (!page) return new Response("Not found", { status: 404 });
  return previewCard(page, await requestOrigin(), page.person.username);
}
