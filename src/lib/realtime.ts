import { createClient } from "@supabase/supabase-js";
import type { PublicReport } from "@/db/schema";
import { env } from "@/env";

/**
 * Server-side Supabase client used purely to broadcast public report events to
 * the map. We broadcast (rather than relying on Postgres change-data-capture)
 * so ONLY PII-free public fields ever leave the server — subscribers never see
 * raw rows.
 *
 * Created lazily so importing this module at build time (when secrets may be
 * absent) never constructs a client.
 */
let cachedClient: ReturnType<typeof createClient> | null = null;
function supabaseClient() {
  cachedClient ??= createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
  );
  return cachedClient;
}

export const PUBLIC_REPORTS_CHANNEL = "reports:public";

export type ReportEvent =
  | { type: "report:published"; report: PublicReport }
  | { type: "report:removed"; id: string };

/**
 * Push an event to every connected map client. Best-effort.
 *
 * Uses `httpSend` (REST) for the broadcast — same as pawboard's server-side
 * broadcast helper — so a serverless function never needs to open a WebSocket.
 */
export async function broadcastReportEvent(event: ReportEvent): Promise<void> {
  try {
    const supabase = supabaseClient();
    const channel = supabase.channel(PUBLIC_REPORTS_CHANNEL);
    await channel.httpSend("report-event", event);
    await supabase.removeChannel(channel);
  } catch (err) {
    console.error("[realtime] broadcast failed:", err);
  }
}
