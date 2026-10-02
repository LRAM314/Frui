import { Router } from "express";
import { db } from "@workspace/db";
import {
  workoutPlansTable,
  dailyWorkoutsTable,
  usersTable,
  categoriesTable,
  type Category,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { addDays, format, getDay, startOfDay } from "date-fns";
import { ensureProfile } from "../lib/intake-service";

const router = Router();

// Ensure user row exists (JIT provisioning)
async function ensureUser(clerkUserId: string) {
  return ensureProfile(clerkUserId);
}

// GET /api/plans
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    await ensureUser(userId);
    const plans = await db
      .select()
      .from(workoutPlansTable)
      .where(eq(workoutPlansTable.userId, userId));

    res.json(
      plans.map((p) => ({
        id: p.id,
        userId: p.userId,
        mesocycleDurationWeeks: p.mesocycleDurationWeeks,
        status: p.status,
        prescribedCategoryIds: p.prescribedCategoryIds,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list plans");
    res.status(500).json({ error: "Internal server error" });
  }
});

const createPlanSchema = z.object({
  mesocycleDurationWeeks: z.number().min(1).max(16),
  prescribedCategoryIds: z.array(z.string()).min(1),
});

// POST /api/plans
router.post("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { mesocycleDurationWeeks, prescribedCategoryIds } = parsed.data;

  try {
    const user = await ensureUser(userId);
    if (!user.onboardingCompletedAt) {
      res.status(403).json({ error: "Finish onboarding before creating a new plan." });
      return;
    }
    const planId = randomUUID();
    const [plan] = await db
      .insert(workoutPlansTable)
      .values({
        id: planId,
        userId,
        mesocycleDurationWeeks,
        status: "active",
        prescribedCategoryIds,
      })
      .returning();

    // Seed daily workouts: one per day of week for each week in the mesocycle
    // Distribute prescribed categories across the week
    const workouts = [];
    const startDate = startOfDay(new Date());
    const daysPerWeek = Math.min(prescribedCategoryIds.length, 5); // up to 5 training days

    for (let week = 0; week < mesocycleDurationWeeks; week++) {
      for (let dayIndex = 0; dayIndex < daysPerWeek; dayIndex++) {
        // Skip weekends (offset to Mon-Fri pattern)
        const daysOffset = week * 7 + dayIndex + (dayIndex >= 5 ? 2 : 0);
        const scheduledDate = addDays(startDate, daysOffset);
        const dow = getDay(scheduledDate);

        // Rotate category assignments
        const categoryForDay = prescribedCategoryIds[dayIndex % prescribedCategoryIds.length];

        workouts.push({
          id: randomUUID(),
          planId,
          dayOfWeek: dow,
          weekNumber: week + 1,
          scheduledDate: format(scheduledDate, "yyyy-MM-dd"),
          targetDurationMinutes: 60,
          prescribedCategoryIds: [categoryForDay],
          completed: false,
        });
      }
    }

    if (workouts.length > 0) {
      await db.insert(dailyWorkoutsTable).values(workouts);
    }

    res.status(201).json({
      id: plan.id,
      userId: plan.userId,
      mesocycleDurationWeeks: plan.mesocycleDurationWeeks,
      status: plan.status,
      prescribedCategoryIds: plan.prescribedCategoryIds,
      createdAt: plan.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create plan");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/plans/:id
router.get("/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const id = String(req.params.id);

  try {
    const [plan] = await db
      .select()
      .from(workoutPlansTable)
      .where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, userId)))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const workouts = await db
      .select()
      .from(dailyWorkoutsTable)
      .where(eq(dailyWorkoutsTable.planId, id));

    // Fetch category details
    const allCategoryIds = Array.from(
      new Set(workouts.flatMap((w) => w.prescribedCategoryIds))
    );
    const categories =
      allCategoryIds.length > 0
        ? await db
            .select()
            .from(categoriesTable)
            .where(inArray(categoriesTable.id, allCategoryIds))
        : [];

    const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));

    const toCategoryShape = (cid: string) => {
      const c = categoryMap.get(cid);
      return c ? { id: c.id, parentModality: c.parentModality, subCategory: c.subCategory } : null;
    };

    res.json({
      id: plan.id,
      userId: plan.userId,
      mesocycleDurationWeeks: plan.mesocycleDurationWeeks,
      status: plan.status,
      prescribedCategoryIds: plan.prescribedCategoryIds,
      createdAt: plan.createdAt.toISOString(),
      workouts: workouts.map((w) => ({
        id: w.id,
        planId: w.planId,
        dayOfWeek: w.dayOfWeek,
        weekNumber: w.weekNumber,
        scheduledDate: w.scheduledDate,
        targetDurationMinutes: w.targetDurationMinutes,
        prescribedCategories: w.prescribedCategoryIds
          .map(toCategoryShape)
          .filter((c): c is NonNullable<typeof c> => c !== null),
        completed: w.completed,
        planStatus: plan.status,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get plan");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/plans/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const id = String(req.params.id);

  try {
    const [plan] = await db
      .select()
      .from(workoutPlansTable)
      .where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, userId)))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    await db.delete(workoutPlansTable).where(eq(workoutPlansTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete plan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
