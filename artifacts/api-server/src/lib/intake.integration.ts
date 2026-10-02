/**
 * Run explicitly with tsx. Creates only uniquely prefixed test profiles and
 * removes those exact profiles afterward; never modifies real users.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, pool, usersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { ensureProfile, intakeState, savePrivateIntake, saveIntakeSchema } from "./intake-service";

const users = [`intake-test-${randomUUID()}`, `intake-test-${randomUUID()}`];
try {
  const [first, other] = await Promise.all(users.map(ensureProfile));
  assert.equal(first.intakeRevision, 0);
  assert.equal(first.onboardingRequired, true);
  assert.equal(other.intake, null);
  const initial = { biometrics: { age: 30, sex: "Male" as const } };
  const saved = await savePrivateIntake(users[0], { data: initial, step: 1, revision: 0, complete: false });
  assert.equal(saved.status, 200);
  assert.equal((saved.body as ReturnType<typeof intakeState>).revision, 1);
  const restored = intakeState(await ensureProfile(users[0]));
  assert.deepEqual(restored.draft, initial);
  assert.equal(restored.step, 1);
  assert.equal(intakeState(await ensureProfile(users[1])).draft, null, "Profiles are isolated");
  const stale = await savePrivateIntake(users[0], { data: initial, step: 1, revision: 0, complete: false });
  assert.equal(stale.status, 409);
  assert.equal((await savePrivateIntake(users[0], { data: initial, step: 7, revision: 1, complete: true })).status, 400);
  const complete = saveIntakeSchema.parse({
    data: {
      ...initial, goals: ["max-strength"], primaryGoal: "max-strength",
      preferredModalities: ["barbell", "walking"], dislikedModalities: [],
      availableResources: ["bodyweight"], frequencyDays: 6, weekdays: [0, 1, 2, 3, 4, 5],
      highMinutes: 45, lowMinutes: 60, timezone: "America/Detroit",
      baselines: { skipped: true, pushUps: 0 }, limitations: { answer: "Prefer not to say" },
    }, step: 7, revision: 1, complete: true,
  });
  const published = await savePrivateIntake(users[0], complete);
  assert.equal(published.status, 200);
  const publishedState = intakeState(await ensureProfile(users[0]));
  assert(publishedState.completedAt);
  assert.equal(publishedState.required, false);
  assert.equal(publishedState.draft, null);
  assert.equal(publishedState.revision, 2);
  assert.deepEqual((await ensureProfile(users[0])).preferredModalities, ["barbell", "walking"]);
  const repeat = await savePrivateIntake(users[0], complete);
  assert.equal(repeat.status, 200, "Retries are idempotent");
  assert.equal((await ensureProfile(users[0])).intakeRevision, 2);
  const editing = { ...complete.data, biometrics: { ...complete.data.biometrics, weightKg: 70 } };
  await savePrivateIntake(users[0], { data: editing, step: 0, revision: 2, complete: false });
  const editState = intakeState(await ensureProfile(users[0]));
  assert(editState.completedAt, "Saving an edit draft preserves completion");
  assert.equal((editState.data as any).biometrics.weightKg, undefined, "Drafts cannot change published data");
  const cleared = { ...editing, biometrics: { ...editing.biometrics, weightKg: null } };
  const final = await savePrivateIntake(users[0], { data: cleared, step: 7, revision: 3, complete: true });
  assert.equal(final.status, 200);
  assert.equal((intakeState(await ensureProfile(users[0])).data as any).biometrics.weightKg, null);
  console.log("Supabase intake checks passed: draft resume, isolation, optimistic conflicts, required completion, atomic publication, repeat safety and explicit clearing.");
} finally {
  await db.delete(usersTable).where(inArray(usersTable.id, users));
  await pool.end();
}