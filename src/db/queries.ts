import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { PublicQueryInput } from "@/lib/validations";
import { db } from "./index";
import { type PublicReport, type Report, reports } from "./schema";

/**
 * Public map/feed query. Returns ONLY published reports with coarsened coords
 * and no PII. This is the single function the public surface is allowed to call.
 */
export async function getPublicReports(
  filters: PublicQueryInput,
): Promise<PublicReport[]> {
  const since = new Date(Date.now() - filters.sinceHours * 60 * 60 * 1000);

  const where = and(
    eq(reports.status, "published"),
    gte(reports.publishedAt, since),
    filters.category ? eq(reports.category, filters.category) : undefined,
    filters.severity ? eq(reports.severity, filters.severity) : undefined,
    filters.estado ? eq(reports.estado, filters.estado) : undefined,
  );

  return db
    .select({
      id: reports.id,
      category: reports.category,
      severity: reports.severity,
      summary: reports.summary,
      estado: reports.estado,
      municipio: reports.municipio,
      parroquia: reports.parroquia,
      lat: reports.publicLat,
      lng: reports.publicLng,
      createdAt: reports.createdAt,
      publishedAt: reports.publishedAt,
    })
    .from(reports)
    .where(where)
    .orderBy(desc(reports.publishedAt))
    .limit(1000);
}

/** Moderation queue — newest unprocessed reports first. Internal surface. */
export async function getQueue(
  status: Report["status"] = "pending",
): Promise<Report[]> {
  return db
    .select()
    .from(reports)
    .where(eq(reports.status, status))
    .orderBy(desc(reports.createdAt))
    .limit(100);
}

export async function getReport(id: string): Promise<Report | undefined> {
  return db.query.reports.findFirst({ where: eq(reports.id, id) });
}

/** Counts per status — drives the queue dashboard header. */
export async function getStatusCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: reports.status, count: sql<number>`count(*)::int` })
    .from(reports)
    .groupBy(reports.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.count]));
}
