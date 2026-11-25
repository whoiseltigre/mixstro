// Replays every migration on plain Postgres and runs the SQL tests in supabase/tests/.
//
//   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres node scripts/db-test.mjs
//
// Two databases, so new migrations are proven against both kinds of history:
//   fresh   every migration from an empty database
//   legacy  the migrations production already has (PROD_BASELINE), synthetic rows shaped like
//           real data (supabase/tests/legacy-seed.sql), then the newer migrations on top
// Each *.test.sql file runs in one transaction that is rolled back, as the roles it names.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** The newest migration that has been applied to production. Move it forward after each release. */
export const PROD_BASELINE = "20261120010000";

const root = new URL("..", import.meta.url).pathname;
const url = new URL(process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres");
const migrations = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
const tests = readdirSync(join(root, "supabase/tests")).filter((f) => f.endsWith(".test.sql")).sort();
const only = process.argv.slice(2);
const tmp = mkdtempSync(join(tmpdir(), "mixstro-db-"));

function psql(db, file, { quiet = true } = {}) {
  const u = new URL(url);
  u.pathname = `/${db}`;
  const out = execFileSync("psql", [u.toString(), "-v", "ON_ERROR_STOP=1", "-X", "-q", "-f", file], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return quiet ? "" : out;
}

function sql(db, text) {
  const f = join(tmp, `q${Math.random().toString(36).slice(2)}.sql`);
  writeFileSync(f, text);
  return psql(db, f);
}

/** pg_cron and pg_net can't be installed on plain Postgres; the stubs provide what they're used for. */
function migrationFile(name) {
  const src = readFileSync(join(root, "supabase/migrations", name), "utf8").replace(/^create extension if not exists pg_(cron|net);$/gm, "-- (stubbed) $&");
  const f = join(tmp, name);
  writeFileSync(f, src);
  return f;
}

function createDb(db) {
  sql("postgres", `drop database if exists ${db} with (force); create database ${db};`);
  psql(db, join(root, "supabase/tests/supabase-stubs.sql"));
}

function apply(db, list) {
  for (const m of list) {
    try {
      psql(db, migrationFile(m));
    } catch (e) {
      throw new Error(`${db}: migration ${m} failed\n${e.stderr ?? e.message}`);
    }
  }
}

function runTests(db) {
  psql(db, join(root, "supabase/tests/helpers.sql"));
  let failed = 0;
  for (const t of tests) {
    if (only.length && !only.some((o) => t.includes(o))) continue;
    const f = join(tmp, `run-${t}`);
    writeFileSync(f, `begin;\n${readFileSync(join(root, "supabase/tests", t), "utf8")}\nrollback;\n`);
    try {
      const u = new URL(url);
      u.pathname = `/${db}`;
      const res = execFileSync("psql", [u.toString(), "-v", "ON_ERROR_STOP=1", "-X", "-q", "-f", f], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const oks = (res.match(/ok - /g) ?? []).length;
      console.log(`  ✓ ${t}`);
      void oks;
    } catch (e) {
      failed++;
      const lines = String(e.stderr ?? "").split("\n").filter((l) => /not ok|ERROR|LINE|DETAIL|CONTEXT/.test(l));
      console.log(`  ✗ ${t}\n      ${lines.slice(0, 6).join("\n      ")}`);
    }
  }
  return failed;
}

let failed = 0;
const baseline = migrations.filter((m) => m.slice(0, 14) <= PROD_BASELINE);
const newer = migrations.filter((m) => m.slice(0, 14) > PROD_BASELINE);

console.log(`fresh: ${migrations.length} migrations`);
createDb("mixstro_fresh");
apply("mixstro_fresh", migrations);
failed += runTests("mixstro_fresh");

console.log(`legacy: ${baseline.length} production migrations, synthetic rows, then ${newer.length} newer`);
createDb("mixstro_legacy");
apply("mixstro_legacy", baseline);
psql("mixstro_legacy", join(root, "supabase/tests/legacy-seed.sql"));
apply("mixstro_legacy", newer);
// Migrations must be safe to run twice (people paste them into the SQL editor).
apply("mixstro_legacy", newer);
failed += runTests("mixstro_legacy");

if (failed) {
  console.error(`\n${failed} test file(s) failed.`);
  process.exit(1);
}
console.log("\nDatabase: all migrations replay and all tests pass.");
