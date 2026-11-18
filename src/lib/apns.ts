import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";

/**
 * Sends a notification to an iPhone through Apple Push Notification service (APNs), with no
 * extra packages: an ES256 token signed with the .p8 key from the Apple Developer account,
 * over HTTP/2.
 *
 * Off until these env vars exist (all from developer.apple.com > Keys, one key with APNs):
 *   APNS_KEY_ID       the key's 10-character id
 *   APNS_PRIVATE_KEY  the .p8 file's contents (newlines may be written as \n)
 *   APPLE_TEAM_ID     the 10-character team id (already used for Apple Music)
 *   APNS_BUNDLE_ID    optional, defaults to com.mixstro.app
 */

export function apnsConfigured() {
  return Boolean(process.env.APNS_KEY_ID && process.env.APNS_PRIVATE_KEY && process.env.APPLE_TEAM_ID);
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

let cached: { jwt: string; at: number } | null = null;

/** Apple wants a fresh token at most every 20 to 60 minutes; reuse one for 40. */
function providerToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.at < 40 * 60) return cached.jwt;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: process.env.APNS_KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: process.env.APPLE_TEAM_ID, iat: now }));
  const key = createPrivateKey((process.env.APNS_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"));
  const sig = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  cached = { jwt: `${header}.${claims}.${b64url(sig)}`, at: now };
  return cached.jwt;
}

export type ApnsMessage = { title: string; body: string; url: string; tag?: string };

/**
 * Returns "ok", "gone" (token no longer valid: delete it) or "error".
 * Apple says a token is gone with 410, or 400 BadDeviceToken (e.g. a sandbox token sent to production).
 */
export function sendApns(token: string, msg: ApnsMessage, env: "sandbox" | "production" = "production"): Promise<"ok" | "gone" | "error"> {
  const host = env === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const payload = JSON.stringify({
    aps: { alert: { title: msg.title, body: msg.body }, sound: "mixstro-notify.caf", "thread-id": msg.tag },
    url: msg.url,
  });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: "ok" | "gone" | "error") => {
      if (settled) return;
      settled = true;
      session.close();
      resolve(r);
    };
    const session = connect(host);
    session.on("error", () => finish("error"));
    session.setTimeout(8000, () => finish("error"));
    let req;
    try {
      req = session.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        authorization: `bearer ${providerToken()}`,
        "apns-topic": process.env.APNS_BUNDLE_ID || "com.mixstro.app",
        "apns-push-type": "alert",
        "apns-expiration": String(Math.floor(Date.now() / 1000) + 24 * 60 * 60),
        ...(msg.tag ? { "apns-collapse-id": msg.tag.slice(0, 64) } : {}),
        "content-type": "application/json",
      });
    } catch (e) {
      console.error("apns: request", e);
      return finish("error");
    }
    let status = 0;
    let body = "";
    req.on("response", (h) => (status = Number(h[":status"])));
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (status === 200) return finish("ok");
      const reason = (() => {
        try {
          return (JSON.parse(body) as { reason?: string }).reason;
        } catch {
          return undefined;
        }
      })();
      if (status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") return finish("gone");
      console.error("apns:", status, reason);
      finish("error");
    });
    req.on("error", () => finish("error"));
    req.end(payload);
  });
}
