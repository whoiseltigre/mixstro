/**
 * Sends app notifications (iPhone and Android) through Firebase Cloud Messaging's HTTP v1 API.
 * Plain fetch and Web Crypto only, so it runs on Cloudflare Workers (Apple's own push service
 * needs HTTP/2, which Workers can't open). Firebase hands iPhone messages to Apple using the
 * APNs key uploaded in the Firebase console.
 *
 * Off until FIREBASE_SERVICE_ACCOUNT holds the service account JSON from Firebase console >
 * Project settings > Service accounts > Generate new private key (the whole file, one line).
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function account(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as ServiceAccount;
    return a.project_id && a.client_email && a.private_key ? a : null;
  } catch {
    console.error("fcm: FIREBASE_SERVICE_ACCOUNT isn't valid JSON");
    return null;
  }
}

export function fcmConfigured() {
  return account() !== null;
}

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64urlJson = (o: unknown) => b64url(enc.encode(JSON.stringify(o)));

function pemToDer(pem: string) {
  const body = pem.replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let cached: { token: string; until: number } | null = null;

/** A Google OAuth access token for FCM (good for an hour; reused for 50 minutes). */
async function accessToken(a: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.until > now) return cached.token;
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(a.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const unsigned = `${b64urlJson({ alg: "RS256", typ: "JWT" })}.${b64urlJson({
    iss: a.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
  });
  if (!res.ok) {
    console.error("fcm: token", res.status);
    return null;
  }
  const { access_token } = (await res.json()) as { access_token: string };
  cached = { token: access_token, until: now + 50 * 60 };
  return access_token;
}

export type AppPushMessage = { title: string; body: string; url: string; tag?: string };

/** Returns "ok", "gone" (the app was removed or the token expired: delete it) or "error". */
export async function sendFcm(token: string, msg: AppPushMessage): Promise<"ok" | "gone" | "error"> {
  const a = account();
  if (!a) return "error";
  try {
    const bearer = await accessToken(a);
    if (!bearer) return "error";
    const tag = msg.tag?.slice(0, 64);
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${a.project_id}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: msg.title, body: msg.body },
          data: { url: msg.url },
          android: { ttl: "86400s", notification: { tag, sound: "default", color: "#FFB245" } },
          apns: {
            headers: { "apns-expiration": String(Math.floor(Date.now() / 1000) + 86400), ...(tag ? { "apns-collapse-id": tag } : {}) },
            payload: { aps: { sound: "mixstro-notify.caf", ...(tag ? { "thread-id": tag } : {}) } },
          },
        },
      }),
    });
    if (res.ok) return "ok";
    const err = (await res.json().catch(() => ({}))) as { error?: { status?: string; details?: { errorCode?: string }[] } };
    const code = err.error?.details?.find((d) => d.errorCode)?.errorCode ?? err.error?.status;
    // Only a token Firebase no longer knows is dropped; a 400 could be our own payload.
    if (res.status === 404 || code === "UNREGISTERED") return "gone";
    console.error("fcm:", res.status, code);
    return "error";
  } catch (e) {
    console.error("fcm:", e);
    return "error";
  }
}
