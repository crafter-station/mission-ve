import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed, validated environment. Inspired by the pawboard setup.
 * Secrets live server-side only; anything the browser needs is NEXT_PUBLIC_*.
 */
export const env = createEnv({
  server: {
    // Postgres (Supabase) connection string — use the pooler URL in production.
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    // Kapso / WhatsApp Cloud API
    KAPSO_API_KEY: z.string().optional(),
    KAPSO_BASE_URL: z
      .string()
      .url()
      .default("https://api.kapso.ai/meta/whatsapp"),
    KAPSO_PHONE_NUMBER_ID: z.string().optional(),
    // App secret used to verify inbound webhook signatures (X-Hub-Signature-256).
    WHATSAPP_APP_SECRET: z.string().optional(),
    // Token echoed back during the webhook subscription handshake (GET challenge).
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),

    // Server-side pepper for hashing reporter phone numbers. We NEVER store raw numbers.
    REPORTER_HASH_SECRET: z.string().min(1, "REPORTER_HASH_SECRET is required"),

    // Lightweight moderator gate (MVP). Swap for Supabase Auth later.
    MODERATOR_PASSWORD: z.string().min(1, "MODERATOR_PASSWORD is required"),
    MODERATOR_SESSION_SECRET: z
      .string()
      .min(1, "MODERATOR_SESSION_SECRET is required"),
    // Number of independent moderator confirmations required before publishing.
    PUBLISH_THRESHOLD: z.coerce.number().int().min(1).max(5).default(1),
  },

  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
      .string()
      .min(1, "Supabase anon key is required"),
    // Optional MapLibre style URL (defaults to a free demo style in code).
    NEXT_PUBLIC_MAP_STYLE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    KAPSO_API_KEY: process.env.KAPSO_API_KEY,
    KAPSO_BASE_URL: process.env.KAPSO_BASE_URL,
    KAPSO_PHONE_NUMBER_ID: process.env.KAPSO_PHONE_NUMBER_ID,
    WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
    REPORTER_HASH_SECRET: process.env.REPORTER_HASH_SECRET,
    MODERATOR_PASSWORD: process.env.MODERATOR_PASSWORD,
    MODERATOR_SESSION_SECRET: process.env.MODERATOR_SESSION_SECRET,
    PUBLISH_THRESHOLD: process.env.PUBLISH_THRESHOLD,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
