// Every migration is named <14-digit timestamp>_<name>.sql and no two share a timestamp,
// so they always apply in one clear order.
import { readdirSync } from "node:fs";

const dir = new URL("../supabase/migrations/", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
const bad = files.filter((f) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(f));
const seen = new Map();
for (const f of files) {
  const ts = f.slice(0, 14);
  if (seen.has(ts)) bad.push(`${f} (same timestamp as ${seen.get(ts)})`);
  seen.set(ts, f);
}
if (bad.length) {
  console.error("Migration names must be <14-digit timestamp>_<lowercase_name>.sql:\n  " + bad.join("\n  "));
  process.exit(1);
}
console.log(`Migrations: ${files.length} named correctly.`);
