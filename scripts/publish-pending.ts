/**
 * DEV-ONLY moderation bypass — Reporte VE.
 *
 * Publishes every `pending` (and `verified`) report immediately, replicating
 * what a moderator does in /moderation: assign a category, coarsen coords, scrub
 * PII, and flip status to `published` so the report shows on the public map.
 *
 * This skips the human verification step on purpose — use it ONLY for local
 * testing, never against production data.
 *
 *   bun --env-file=.env.local scripts/publish-pending.ts
 */
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { reports } from "../src/db/schema";
import { coarsenCoords, scrubPII } from "../src/lib/privacy";
import { type Category, estadoCentroid, isCategory } from "../src/lib/taxonomy";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema: { reports } });

const pending = await db
  .select()
  .from(reports)
  .where(inArray(reports.status, ["pending", "verified"]));

if (!pending.length) {
  console.log("No pending/verified reports to publish.");
  await client.end();
  process.exit(0);
}

const now = new Date();
let published = 0;

for (const r of pending) {
  // Public coords: coarsen precise lat/lng if present, else estado centroid.
  const coords =
    r.lat != null && r.lng != null
      ? coarsenCoords(r.lat, r.lng)
      : ((r.estado ? estadoCentroid(r.estado) : null) ?? {
          lat: null,
          lng: null,
        });

  // Category: keep an existing one, else first valid reporter-supplied hint, else "other".
  const hint = r.categories?.[0];
  const category: Category =
    r.category ?? (hint && isCategory(hint) ? hint : "other");

  await db
    .update(reports)
    .set({
      category,
      severity: r.severity ?? "medium",
      summary: scrubPII(r.summary ?? r.rawText ?? "Reporte sin descripción"),
      publicLat: coords.lat,
      publicLng: coords.lng,
      status: "published",
      publishedAt: now,
      updatedAt: now,
    })
    .where(inArray(reports.id, [r.id]));

  published++;
  console.log(`✓ published ${r.id} (${category}, ${r.estado ?? "sin estado"})`);
}

console.log(`\nPublished ${published} report(s). Refresh the map.`);
await client.end();
process.exit(0);
