import "server-only";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { env } from "@/env";

/**
 * Report media storage — Vercel Blob.
 *
 * Photos a reporter attaches are supporting evidence, not public by default.
 * Every blob gets an unguessable URL; we keep that URL INTERNAL (moderators
 * only) and never surface it on the public map until a moderator approves the
 * photo — at which point its URL is copied into the report's `publicMedia`.
 *
 * EXIF/GPS metadata is stripped client-side (canvas re-encode) before upload,
 * so a stored photo can't leak the reporter's exact location.
 *
 * Server-only. Requires BLOB_READ_WRITE_TOKEN; without it the photo feature is
 * hidden (`storageEnabled()` is false).
 */

export function storageEnabled(): boolean {
  return !!env.BLOB_READ_WRITE_TOKEN;
}

const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type UploadFile = { buffer: ArrayBuffer; contentType: string };

/** Upload a report's photos to Blob; returns their (unguessable) URLs. */
export async function uploadReportMedia(
  reportId: string,
  files: UploadFile[],
): Promise<string[]> {
  if (!env.BLOB_READ_WRITE_TOKEN || !files.length) return [];
  const urls: string[] = [];
  let i = 0;
  for (const file of files.slice(0, 3)) {
    const ext = EXT[file.contentType] ?? "jpg";
    try {
      const blob = await put(
        `reports/${reportId}/${i}-${nanoid(8)}.${ext}`,
        file.buffer,
        {
          access: "public",
          contentType: file.contentType,
          token: env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: true,
        },
      );
      urls.push(blob.url);
    } catch (err) {
      console.error("[storage] blob upload failed:", err);
    }
    i++;
  }
  return urls;
}
