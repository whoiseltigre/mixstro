import { roleOf } from "@/lib/openings";
import { getViewer } from "@/lib/people";
import { NewPostForm } from "./form";

export const metadata = { title: "New post · The Board" };
export const dynamic = "force-dynamic";

export default async function NewPost() {
  const viewer = await getViewer();
  const p = viewer?.profile;
  return <NewPostForm neighborhood={p?.neighborhood ?? ""} signedIn={Boolean(viewer)} myRole={roleOf(p?.main_instrument ?? p?.instruments[0])} />;
}
