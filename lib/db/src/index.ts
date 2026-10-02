import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * Parse a Postgres connection string into individual Pool config parameters,
 * bypassing pg-connection-string's strict URL parsing which fails when the
 * password contains un-encoded special characters.
 *
 * Supports: postgresql://user:pass@host:port/db[?sslmode=...]
 */
function parseConnectionString(url: string): pg.PoolConfig {
  // First try the standard URL API — works when the password is URL-safe.
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      ssl: u.searchParams.get("sslmode") !== "disable"
        ? { rejectUnauthorized: false }
        : false,
    };
  } catch {
    // Fallback regex: grabs user, raw password (may contain @), host, port, db.
    // Works because we match the LAST '@' in the user-info section by consuming
    // everything greedily and letting the host group anchor on :[port]/db.
    const m = url.match(
      /^(?:postgresql?):\/\/([^:@]+):(.+)@([^:/]+)(?::(\d+))?\/([^?]*)/,
    );
    if (!m) {
      throw new Error(
        "SUPABASE_DATABASE_URL is not a valid Postgres connection string. " +
          "Expected format: postgresql://user:password@host:port/database",
      );
    }
    const [, user, password, host, port, database] = m;
    const sslmatch = url.match(/[?&]sslmode=([^&]+)/);
    const sslmode = sslmatch ? sslmatch[1] : "require";
    return {
      host,
      port: port ? parseInt(port, 10) : 5432,
      user,
      password, // raw — pg accepts this directly without URL-decoding
      database,
      ssl: sslmode !== "disable" ? { rejectUnauthorized: false } : false,
    };
  }
}

const rawUrl = process.env.SUPABASE_DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL must be set. " +
      "Add your Supabase connection string (postgresql://...) as a secret.",
  );
}

const poolConfig = parseConnectionString(rawUrl);
export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

export * from "./schema";
