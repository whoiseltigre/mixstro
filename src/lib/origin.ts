import { headers } from "next/headers";
import { publicOrigin } from "./redirect";
import { APP_ORIGIN } from "./public-profile";

/** The origin the visitor used (app.mixstro.com, staging, or localhost), for absolute links. */
export async function requestOrigin() {
  return publicOrigin(await headers(), APP_ORIGIN);
}
