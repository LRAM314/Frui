/**
 * Applies the Frui schema to Supabase using raw SQL — bypasses drizzle-kit's
 * URL parsing which fails when passwords contain special characters.
 */
import pg from "pg";

const { Client } = pg;

function parseConnectionString(url: string): pg.ClientConfig {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    const m = url.match(/^(?:postgresql?):\/\/([^:@]+):(.+)@([^:/]+)(?::(\d+))?\/([^?]*)/);
    if (!m) throw new Error("Cannot parse SUPABASE_DATABASE_URL");
    const [, user, password, host, port, database] = m;
    return { host, port: port ? parseInt(port, 10) : 5432, user, password, database, ssl: { rejectUnauthorized: false } };
  }
}

const rawUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (!rawUrl) { console.error("SUPABASE_DATABASE_URL is not set"); process.exit(1); }

const client = new Client(parseConnectionString(rawUrl));

const DDL = `
CREATE TABLE IF NOT EXISTS "categories" (
  "id" text PRIMARY KEY,
  "parent_modality" text NOT NULL,
  "sub_category" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "clerk_user_id" text NOT NULL UNIQUE,
  "preferred_modalities" text[] DEFAULT '{}' NOT NULL,
  "disliked_modalities" text[] DEFAULT '{}' NOT NULL,
  "available_resources" text[] DEFAULT '{}' NOT NULL,
  "athlete_status" text,
  "schedule_matrix" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "workout_plans" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "mesocycle_duration_weeks" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "prescribed_category_ids" text[] DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "daily_workouts" (
  "id" text PRIMARY KEY,
  "plan_id" text NOT NULL REFERENCES "workout_plans"("id") ON DELETE CASCADE,
  "day_of_week" integer NOT NULL,
  "week_number" integer NOT NULL,
  "scheduled_date" date NOT NULL,
  "target_duration_minutes" integer NOT NULL DEFAULT 60,
  "prescribed_category_ids" text[] DEFAULT '{}' NOT NULL,
  "completed" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
`;

async function migrate() {
  console.log("Connecting to Supabase...");
  await client.connect();
  console.log("Applying schema...");
  await client.query(DDL);
  console.log("Schema applied successfully.");
  await client.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
