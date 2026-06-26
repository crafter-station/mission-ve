import { sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { Category, Severity, Source, Status } from "@/lib/taxonomy";

/**
 * reports — every inbound signal becomes one row.
 *
 * Privacy model (Mission 4636's #1 lesson — "default to private data"):
 *   • We never store a raw phone number; only a salted hash (reporterHash).
 *   • rawText / lat / lng / mediaUrl are INTERNAL ONLY (moderation surface).
 *   • publicLat / publicLng are coarsened (e.g. parish/estado centroid) and are
 *     the ONLY coordinates ever served to the public map.
 *   • A report is invisible to the public until status === 'published'.
 */
export const reports = pgTable(
  "reports",
  {
    // Short id doubles as the human-facing ticket number (e.g. in the auto-reply).
    id: text("id").primaryKey(),

    // ── Intake ──
    source: text("source").$type<Source>().notNull(),
    // Provider message id (e.g. WhatsApp wamid) — used for idempotency.
    sourceRef: text("source_ref"),
    // Salted hash of the reporter's phone number. NEVER the raw number.
    reporterHash: text("reporter_hash"),
    // Original message text — internal only, scrubbed before anything is public.
    rawText: text("raw_text"),
    // Internal-only link to any attached media (photo of a queue, outage, etc.).
    mediaUrl: text("media_url"),
    // Internal-only storage paths (private bucket) of photos a reporter attached
    // as supporting evidence. Visible only to moderators via signed URLs.
    media: jsonb("media").$type<string[]>().notNull().default([]),
    // Public URLs of the photos a moderator explicitly approved for the map
    // (EXIF-stripped on upload). Empty until a moderator publishes one.
    publicMedia: jsonb("public_media").$type<string[]>().notNull().default([]),

    // ── Structuring (filled by the crowd / moderators) ──
    // Primary category — moderator-assigned; drives the map color & filters.
    category: text("category").$type<Category>(),
    // All categories a reporter tagged (may be several at once, and may include
    // free-text labels not yet in the taxonomy). Hints until a moderator sets
    // the canonical `category`; never constrained to the enum at the DB layer.
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    severity: text("severity").$type<Severity>(),
    status: text("status").$type<Status>().notNull().default("pending"),
    // Human-readable summary shown publicly (no PII).
    summary: text("summary"),

    // ── Geo ──
    estado: text("estado"),
    municipio: text("municipio"),
    parroquia: text("parroquia"),
    // Precise coords — INTERNAL ONLY.
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    // Coarsened coords — the only ones exposed publicly.
    publicLat: doublePrecision("public_lat"),
    publicLng: doublePrecision("public_lng"),

    // ── Verification / dedupe ──
    // Set of moderator ids who confirmed this report (agreement => publishable).
    verifiedBy: jsonb("verified_by").$type<string[]>().notNull().default([]),
    // If this is a duplicate, point at the canonical report.
    duplicateOf: text("duplicate_of"),
    moderatorNote: text("moderator_note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_category_idx").on(t.category),
    index("reports_estado_idx").on(t.estado),
    index("reports_created_at_idx").on(t.createdAt),
    // Fast idempotency lookups on inbound webhook retries.
    index("reports_source_ref_idx").on(t.sourceRef),
  ],
);

/**
 * audit_log — append-only trail of every state change on a report.
 * Critical for a tool operating under an adversarial threat model: who did what.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_log_report_id_idx").on(t.reportId),
    index("audit_log_created_at_idx").on(t.createdAt),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;

/** Columns safe to expose to the public map — no PII, coarsened geo only. */
export const PUBLIC_REPORT_COLUMNS = {
  id: reports.id,
  category: reports.category,
  categories: reports.categories,
  severity: reports.severity,
  summary: reports.summary,
  estado: reports.estado,
  municipio: reports.municipio,
  parroquia: reports.parroquia,
  lat: reports.publicLat,
  lng: reports.publicLng,
  media: reports.publicMedia,
  createdAt: reports.createdAt,
  publishedAt: reports.publishedAt,
} as const;

/** Shape of a report as served to the public map/feed. */
export type PublicReport = {
  id: string;
  category: Category | null;
  categories: string[];
  severity: Severity | null;
  summary: string | null;
  estado: string | null;
  municipio: string | null;
  parroquia: string | null;
  lat: number | null;
  lng: number | null;
  // Public, moderator-approved photo URLs (empty for most reports).
  media: string[];
  createdAt: Date;
  publishedAt: Date | null;
};

// Keep `sql` import meaningful for future default expressions / generated cols.
export const _schemaVersion = sql`1`;
