import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router = Router();

async function ensureUser(clerkUserId: string) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(usersTable)
    .values({
      id: clerkUserId,
      clerkUserId,
      preferredModalities: [],
      dislikedModalities: [],
      availableResources: [],
    })
    .returning();
  return created;
}

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
});

// PATCH /api/profile
router.patch("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    await ensureUser(userId);
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
