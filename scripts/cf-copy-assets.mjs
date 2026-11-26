// After the OpenNext build: copy files the server reads from disk into Workers static assets,
// because Cloudflare Workers have no filesystem. src/lib/share-cards.tsx reads them from /_og/.
import { cpSync, existsSync } from "node:fs";

if (!existsSync(".open-next/assets")) throw new Error("Run `opennextjs-cloudflare build` first");
cpSync("src/assets/og", ".open-next/assets/_og", { recursive: true });
console.log("Copied src/assets/og -> .open-next/assets/_og");
