import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";

/** Browser-side Supabase client (used for Realtime subscriptions on the map). */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
  );
}
