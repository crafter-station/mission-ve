import {
  normalizeWebhook,
  verifySignature,
} from "@kapso/whatsapp-cloud-api/server";
import type { NextRequest } from "next/server";
import { env } from "@/env";
import { ingestReport } from "@/lib/ingest";
import { hashReporter } from "@/lib/privacy";
import { acknowledgementMessage, replyText } from "@/lib/whatsapp";

// This route reads the raw body + headers, so it must run per-request.
export const dynamic = "force-dynamic";

/**
 * GET — webhook subscription handshake.
 * Meta/Kapso send ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 * We echo the challenge back iff the verify token matches.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (
    mode === "subscribe" &&
    env.WHATSAPP_VERIFY_TOKEN &&
    token === env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST — inbound message delivery.
 * 1. Verify the X-Hub-Signature-256 HMAC over the raw body.
 * 2. Normalize the payload and ingest each user message.
 * 3. Acknowledge the reporter with a ticket id + privacy notice.
 *
 * We always return 200 quickly once authenticated so the provider doesn't
 * retry-storm us; ingestion errors are logged, not surfaced.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // 1. Authenticate the payload. If an app secret is configured, it's required.
  if (env.WHATSAPP_APP_SECRET) {
    const ok = verifySignature({
      appSecret: env.WHATSAPP_APP_SECRET,
      rawBody,
      signatureHeader: request.headers.get("x-hub-signature-256") ?? undefined,
    });
    if (!ok) return new Response("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const { messages } = normalizeWebhook(payload);

  // Process inbound user messages. Status updates / other events are ignored.
  await Promise.all(
    messages.map(async (msg) => {
      // Only handle messages a person actually sent us.
      if (msg.kapso?.direction && msg.kapso.direction !== "inbound") return;
      const from = msg.from ?? msg.kapso?.phoneNumber;
      if (!from) return;

      const text =
        msg.text?.body ??
        msg.image?.caption ??
        msg.video?.caption ??
        msg.document?.caption ??
        null;

      const mediaUrl =
        msg.image?.link ??
        msg.video?.link ??
        msg.document?.link ??
        msg.kapso?.mediaUrl ??
        null;

      try {
        const { id, deduped } = await ingestReport({
          source: "whatsapp",
          sourceRef: msg.id,
          reporterHash: hashReporter(from),
          rawText: text,
          mediaUrl,
          lat: msg.location?.latitude ?? null,
          lng: msg.location?.longitude ?? null,
          // A shared WhatsApp location often carries a place name.
          municipio: msg.location?.name ?? null,
        });

        // Acknowledge only the first time we see a message (not on retries).
        if (!deduped) {
          await replyText({
            to: from,
            body: acknowledgementMessage(id),
            contextMessageId: msg.id,
          });
        }
      } catch (err) {
        console.error("[webhook] failed to ingest message", msg.id, err);
      }
    }),
  );

  return new Response("OK", { status: 200 });
}
