import { db, usersTable, type User } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { IntakeSchema, completionErrors } from "@workspace/api-zod";
import { z } from "zod";
import { isDeepStrictEqual } from "node:util";

export const saveIntakeSchema = z.object({
  data: IntakeSchema,
  step: z.number().int().min(0).max(7),
  revision: z.number().int().min(0),
  complete: z.boolean(),
}).strict();

export async function ensureProfile(userId: string): Promise<User> {
  await db.insert(usersTable).values({ id: userId, clerkUserId: userId }).onConflictDoNothing();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) throw new Error("Profile unavailable");
  return user;
}

export function intakeState(user: User) {
  return {
    data: user.intake ?? null,
    draft: user.intakeDraft ?? null,
    step: user.intakeStep,
    revision: user.intakeRevision,
    version: user.intakeVersion,
    required: user.onboardingRequired,
    completedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  };
}

export async function savePrivateIntake(userId: string, input: z.infer<typeof saveIntakeSchema>) {
  const errors = input.complete ? completionErrors(input.data) : [];
  if (errors.length) return { status: 400, body: { error: "Please finish the required questions.", errors } };
  const user = await ensureProfile(userId);
  const assessment = new Date().toISOString().slice(0, 10);
  const data = input.complete ? {
    ...input.data,
    biometrics: { ...input.data.biometrics, assessedOn: input.data.biometrics?.assessedOn ?? assessment },
  } : input.data;
  // Repeat submissions with the same published data are safely idempotent.
  if (input.complete && user.onboardingCompletedAt && !user.intakeDraft &&
      isDeepStrictEqual(user.intake, data)) {
    return { status: 200, body: intakeState(user) };
  }
  const [saved] = await db.update(usersTable).set({
    ...(input.complete ? {
      intake: data,
      intakeDraft: null,
      onboardingCompletedAt: user.onboardingCompletedAt ?? new Date(),
      onboardingRequired: false,
      preferredModalities: data.preferredModalities ?? [],
      dislikedModalities: data.dislikedModalities ?? [],
      availableResources: data.availableResources ?? [],
      scheduleMatrix: { weekdays: data.weekdays, timezone: data.timezone },
    } : { intakeDraft: data }),
    intakeStep: input.step,
    intakeRevision: input.revision + 1,
    intakeVersion: 1,
    updatedAt: new Date(),
  }).where(and(eq(usersTable.id, userId), eq(usersTable.intakeRevision, input.revision))).returning();
  if (!saved) return { status: 409, body: { error: "Your intake changed in another session. Reload the latest saved answers before continuing." } };
  return { status: 200, body: intakeState(saved) };
}