import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

/**
 * Cloudflare Workers build (replaces AWS Amplify).
 * - Prerendered pages (blog posts, homepage, band name generator) are stored in R2 at deploy time.
 * - Pages with `revalidate` (sitemap, band name generator) refresh in the background through a
 *   Durable Object queue, the same stale-while-revalidate behaviour Amplify gave us.
 * App pages read cookies, so they render on every request and never touch this cache.
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
});
