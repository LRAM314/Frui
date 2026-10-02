import { pool } from "@workspace/db";
import { MODALITIES } from "@workspace/api-zod";

// Additive migration only. Never fall back to Replit's database for this project.
if (!process.env.SUPABASE_DATABASE_URL) throw new Error("Supabase is required");
const client = await pool.connect().catch(() => {
  console.error("Cannot connect to Supabase. No migration changes were made. Check that the project is active and the Session Pooler connection is current.");
  process.exit(1);
});
try {
  await client.query("BEGIN");
  // Existing users are invited, not forcibly redirected. New users get true by default.
  const { rows: columns } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='onboarding_required'",
  );
  await client.query(`
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS intake jsonb,
      ADD COLUMN IF NOT EXISTS intake_draft jsonb,
      ADD COLUMN IF NOT EXISTS intake_step integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS intake_revision integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS intake_version integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS onboarding_required boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp;
  `);
  if (!columns.length) await client.query("UPDATE public.users SET onboarding_required=false");
  // These private tables are used only through the Clerk-authenticated server.
  // Owner/postgres and service_role bypass RLS; anon/authenticated must not gain direct access.
  await client.query(`
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.daily_workouts ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.users, public.workout_plans, public.daily_workouts FROM anon, authenticated;
  `);
  for (const [slug, label, parent] of MODALITIES) {
    // Reuse exact existing meanings without renaming broader legacy categories.
    const { rows } = await client.query("SELECT id FROM public.categories WHERE parent_modality=$1 AND sub_category=$2 LIMIT 1", [parent, label]);
    if (!rows.length) await client.query(
      "INSERT INTO public.categories(id,parent_modality,sub_category) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING",
      [slug, parent, label],
    );
  }
  const { rows: privacy } = await client.query(`
    SELECT
      has_table_privilege('anon','public.users','SELECT') AS anon_read,
      has_table_privilege('authenticated','public.users','SELECT') AS authenticated_read,
      has_table_privilege('anon','public.users','UPDATE') AS anon_write,
      has_table_privilege('authenticated','public.users','UPDATE') AS authenticated_write
  `);
  if (Object.values(privacy[0]).some(Boolean)) throw new Error("Private intake permissions verification failed");
  await client.query("COMMIT");
  console.log("Phase 2 additive migration and private table access checks passed.");
} catch {
  await client.query("ROLLBACK");
  console.error("Phase 2 migration failed; changes rolled back.");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}