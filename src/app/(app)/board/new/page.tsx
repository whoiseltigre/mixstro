import { getViewer } from "@/lib/people";
import { NewPostForm } from "./form";

export const metadata = { title: "New post · The Board" };
export const dynamic = "force-dynamic";

export default async function NewPost() {
  const viewer = await getViewer();
  return <NewPostForm neighborhood={viewer?.profile?.neighborhood ?? ""} signedIn={Boolean(viewer)} />;
}
