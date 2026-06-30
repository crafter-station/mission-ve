import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { getPublicReports } from "@/db/queries";
import { reports } from "@/db/schema";
import { ingestReport } from "@/lib/ingest";
import { type UploadFile, uploadReportMedia } from "@/lib/storage";
import { publicQuerySchema, webReportSchema } from "@/lib/validations";

const ALLOWED_IMAGE = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Pull the form fields + photo files out of a multipart submission. */
async function parseMultipart(request: NextRequest): Promise<{
  body: Record<string, unknown>;
  files: UploadFile[];
}> {
  const form = await request.formData();
  const num = (v: FormDataEntryValue | null) =>
    v != null && v !== "" ? Number(v) : undefined;
  const categories = form
    .getAll("categories")
    .map(String)
    .filter((s) => s.length > 0);

  const files: UploadFile[] = [];
  for (const entry of form.getAll("photos")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    if (!ALLOWED_IMAGE.has(entry.type) || entry.size > MAX_PHOTO_BYTES)
      continue;
    files.push({ buffer: await entry.arrayBuffer(), contentType: entry.type });
    if (files.length >= MAX_PHOTOS) break;
  }

  return {
    body: {
      text: form.get("text"),
      categories: categories.length ? categories : undefined,
      estado: form.get("estado") || undefined,
      municipio: form.get("municipio") || undefined,
      parroquia: form.get("parroquia") || undefined,
      lat: num(form.get("lat")),
      lng: num(form.get("lng")),
    },
    files,
  };
}

export const dynamic = "force-dynamic";

/**
 * GET /api/reports — public, PII-free feed of published reports for the map.
 * Accepts ?category=&severity=&estado= filters.
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
  const contentType = request.headers.get("content-type") ?? "";
  const multipart = contentType.includes("multipart/form-data");

  let body: unknown;
  let files: UploadFile[] = [];
  try {
    if (multipart) {
      const parsedForm = await parseMultipart(request);
      body = parsedForm.body;
      files = parsedForm.files;
    } else {
      body = await request.json();
    }
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
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

  // Photos land in the private bucket as supporting evidence — never public
  // until a moderator approves them.
  if (files.length) {
    const media = await uploadReportMedia(id, files);
    if (media.length) {
      await db.update(reports).set({ media }).where(eq(reports.id, id));
    }
  }

  return Response.json({ id }, { status: 201 });
}
