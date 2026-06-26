import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Lazily-initialized Drizzle client.
 *
 * We defer the actual connection until first query so that importing this
 * module (e.g. while Next.js collects page data at build time, when secrets may
 * be absent) never touches the database or requires DATABASE_URL.
 */
type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
  db?: DB;
};

function createDb(): DB {
  // Supabase Cloud only. DATABASE_URL is the connection-pooler string (6543,
  // transaction mode) — which requires `prepare: false`.
  const isProduction = process.env.NODE_ENV === "production";

  const client =
    globalForDb.client ??
    postgres(env.DATABASE_URL, {
      prepare: false, // Required for Supabase's transaction pooling mode.
      max: isProduction ? 1 : 10,
      idle_timeout: isProduction ? 0 : 20,
      connect_timeout: 10,
    });

  if (!isProduction) globalForDb.client = client;
  return drizzle(client, { schema });
}

function getDb(): DB {
  globalForDb.db ??= createDb();
  return globalForDb.db;
}

/** Proxy that initializes the real client on first property access. */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
