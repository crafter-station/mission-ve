"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { env } from "@/env";
import { getModerator } from "@/lib/auth";
import { logAudit } from "@/lib/ingest";
import { coarsenCoords, scrubPII } from "@/lib/privacy";
import { broadcastReportEvent } from "@/lib/realtime";
import { estadoCentroid } from "@/lib/taxonomy";
import { moderateReportSchema } from "@/lib/validations";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Structure + confirm a report. Each distinct moderator who confirms is added
 * to `verifiedBy`; once PUBLISH_THRESHOLD distinct confirmations are reached,
 * the report is published (Mission 4636-style redundancy against bad data).
 */
export async function moderateReport(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const moderator = await getModerator();
  if (!moderator) return { ok: false, error: "no_autorizado" };

  const parsed = moderateReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "datos_invalidos" };
  const d = parsed.data;

  const report = await db.query.reports.findFirst({
    where: eq(reports.id, id),
  });
  if (!report) return { ok: false, error: "no_encontrado" };

  const verifiedBy = Array.from(new Set([...report.verifiedBy, moderator]));
  const reachedThreshold = verifiedBy.length >= env.PUBLISH_THRESHOLD;

  // Decide the public (coarsened) location: snap precise coords if given,
  // otherwise fall back to the estado centroid so the point is never exact.
  const publicCoords =
    d.lat != null && d.lng != null
      ? coarsenCoords(d.lat, d.lng)
      : (estadoCentroid(d.estado) ?? { lat: null, lng: null });

  const now = new Date();
  const willPublish = reachedThreshold;

  // Expose only the moderator-approved photos on the public pin. We honor just
  // the URLs that belong to this report, so nothing arbitrary can be exposed.
  const approved = (d.publishMedia ?? []).filter((p) =>
    report.media.includes(p),
  );
  const publicMedia = Array.from(new Set([...report.publicMedia, ...approved]));

  await db
    .update(reports)
    .set({
      category: d.category,
      severity: d.severity,
      summary: scrubPII(d.summary),
      estado: d.estado,
      municipio: d.municipio ?? null,
      parroquia: d.parroquia ?? null,
      lat: d.lat ?? report.lat,
      lng: d.lng ?? report.lng,
      publicLat: publicCoords.lat,
      publicLng: publicCoords.lng,
      publicMedia,
      verifiedBy,
      moderatorNote: d.note ?? report.moderatorNote,
      status: willPublish ? "published" : "verified",
      publishedAt: willPublish ? now : report.publishedAt,
      updatedAt: now,
    })
    .where(eq(reports.id, id));

  await logAudit(id, willPublish ? "published" : "verified", moderator, {
    category: d.category,
    severity: d.severity,
    confirmations: verifiedBy.length,
  });

  if (willPublish) {
    await broadcastReportEvent({
      type: "report:published",
      report: {
        id,
        category: d.category,
        categories: report.categories,
        severity: d.severity,
        summary: scrubPII(d.summary),
        estado: d.estado,
        municipio: d.municipio ?? null,
        parroquia: d.parroquia ?? null,
        lat: publicCoords.lat,
        lng: publicCoords.lng,
        media: publicMedia,
        createdAt: report.createdAt,
        publishedAt: now,
      },
    });
  }

  revalidatePath("/moderation");
  revalidatePath("/");
  return { ok: true };
}

/** Reject a report (spam / not actionable). */
export async function rejectReport(id: string): Promise<ActionResult> {
  const moderator = await getModerator();
  if (!moderator) return { ok: false, error: "no_autorizado" };

  await db
    .update(reports)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(reports.id, id));
  await logAudit(id, "rejected", moderator);

  revalidatePath("/moderation");
  return { ok: true };
}
