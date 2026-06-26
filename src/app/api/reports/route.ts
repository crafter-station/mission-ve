import type { NextRequest } from "next/server";
import { getPublicReports } from "@/db/queries";
import { ingestReport } from "@/lib/ingest";
import { publicQuerySchema, webReportSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports — public, PII-free feed of published reports for the map.
 * Accepts ?category=&severity=&estado=&sinceHours= filters.
 */
export async function GET(request: NextRequest) {
  const parsed = publicQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_query", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = await getPublicReports(parsed.data);
  return Response.json(
    { data },
    { headers: { "cache-control": "public, max-age=15, s-maxage=15" } },
  );
}

/**
 * POST /api/reports — anonymous web-form submission. Lands in the same
 * moderation queue as WhatsApp messages, starting as `pending`.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }

  const parsed = webReportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_report", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { text, categories, estado, municipio, parroquia, lat, lng } =
    parsed.data;
  const { id } = await ingestReport({
    source: "web",
    rawText: text,
    // A web submitter may pre-tag categories/location; moderators still confirm
    // and assign the canonical primary category during structuring.
    categories: categories ?? null,
    estado: estado ?? null,
    municipio: municipio ?? null,
    parroquia: parroquia ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
  });

  return Response.json({ id }, { status: 201 });
}
