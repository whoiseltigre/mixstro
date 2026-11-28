// Fails when a production dependency has a high or critical advisory that isn't a listed,
// owned, unexpired exception in scripts/audit-exceptions.json.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let report;
try {
  report = JSON.parse(execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
} catch (e) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  report = JSON.parse(e.stdout || "{}");
}
const { exceptions } = JSON.parse(readFileSync(new URL("./audit-exceptions.json", import.meta.url), "utf8"));
const today = new Date().toISOString().slice(0, 10);
const problems = [];
for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) {
  if (!["high", "critical"].includes(v.severity)) continue;
  const ex = exceptions.find((e) => e.package === name);
  if (!ex) problems.push(`${name} (${v.severity}): no exception. Run npm audit fix, or add an owned exception.`);
  else if (ex.review_by < today) problems.push(`${name}: exception owned by ${ex.owner} expired on ${ex.review_by}.`);
}
if (report.error) problems.push(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
if (problems.length) {
  console.error("Dependency advisories:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`Dependencies: no unowned high or critical advisories (${Object.keys(report.vulnerabilities ?? {}).length} known, ${exceptions.length} owned exceptions).`);
