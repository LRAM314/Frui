import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { GetIntakeResponse, SaveIntakeBody, SaveIntakeResponse } from "@workspace/api-zod";
import { ensureProfile, intakeState, saveIntakeSchema, savePrivateIntake } from "../lib/intake-service";

const router = Router();

async function ensureUser(clerkUserId: string) {
  return ensureProfile(clerkUserId);
}

router.get("/intake", requireAuth, async (req, res): Promise<void> => {
  try {
    res.json(GetIntakeResponse.parse(intakeState(await ensureProfile((req as any).userId))));
  } catch {
    req.log.error("Unable to read private intake");
    res.status(500).json({ error: "Unable to load your intake. Please retry." });
  }
});

router.put("/intake", requireAuth, async (req, res): Promise<void> => {
  const wire = SaveIntakeBody.safeParse(req.body);
  const parsed = saveIntakeSchema.safeParse(req.body);
  if (!wire.success || !parsed.success) {
    res.status(400).json({ error: "Invalid intake values.", errors: parsed.success ? [] :
      parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
    return;
  }
  try {
    const result = await savePrivateIntake((req as any).userId, parsed.data);
    res.status(result.status).json(result.status === 200 ? SaveIntakeResponse.parse(result.body) : result.body);
  } catch {
    // Never log a query error here: it can contain sensitive JSON parameters.
    req.log.error("Unable to save private intake");
    res.status(500).json({ error: "Your intake could not be saved. Your answers have not been discarded; please retry." });
  }
});

// GET /api/profile
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const user = await ensureUser(userId);
    res.json({
      id: user.id,
      clerkUserId: user.clerkUserId,
      preferredModalities: user.preferredModalities,
      dislikedModalities: user.dislikedModalities,
      availableResources: user.availableResources,
      athleteStatus: user.athleteStatus ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

const updateProfileSchema = z.object({
  preferredModalities: z.array(z.string()).optional(),
  dislikedModalities: z.array(z.string()).optional(),
  availableResources: z.array(z.string()).optional(),
  athleteStatus: z.string().optional(),
}).strict();

// PATCH /api/profile
router.patch("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const user = await ensureUser(userId);
    if (user.onboardingCompletedAt && (
      parsed.data.preferredModalities !== undefined ||
      parsed.data.dislikedModalities !== undefined ||
      parsed.data.availableResources !== undefined
    )) {
      res.status(409).json({ error: "Edit training preferences through the intake editor so your profile stays consistent." });
      return;
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.preferredModalities !== undefined)
      updates.preferredModalities = parsed.data.preferredModalities;
    if (parsed.data.dislikedModalities !== undefined)
      updates.dislikedModalities = parsed.data.dislikedModalities;
    if (parsed.data.availableResources !== undefined)
      updates.availableResources = parsed.data.availableResources;
    if (parsed.data.athleteStatus !== undefined)
      updates.athleteStatus = parsed.data.athleteStatus;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    res.json({
      id: updated.id,
      clerkUserId: updated.clerkUserId,
      preferredModalities: updated.preferredModalities,
      dislikedModalities: updated.dislikedModalities,
      availableResources: updated.availableResources,
      athleteStatus: updated.athleteStatus ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
