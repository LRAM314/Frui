import { Router } from "express";
import { db } from "@workspace/db";
import {
  dailyWorkoutsTable,
  workoutPlansTable,
  categoriesTable,
  type Category,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";
import { format } from "date-fns";

const router = Router();

// GET /api/workouts/today
router.get("/today", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  try {
    // Get all active plans for this user
    const plans = await db
      .select()
      .from(workoutPlansTable)
      .where(and(eq(workoutPlansTable.userId, userId), eq(workoutPlansTable.status, "active")));

    if (plans.length === 0) {
      res.json([]);
      return;
    }

    const planIds = plans.map((p) => p.id);
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const todayStr = format(new Date(), "yyyy-MM-dd");

    const workouts = await db
      .select()
      .from(dailyWorkoutsTable)
      .where(
        and(
          inArray(dailyWorkoutsTable.planId, planIds),
          eq(dailyWorkoutsTable.scheduledDate, todayStr)
        )
      );

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

    const toCat = (cid: string) => {
      const c = categoryMap.get(cid);
      return c ? { id: c.id, parentModality: c.parentModality, subCategory: c.subCategory } : null;
    };

    res.json(
      workouts.map((w) => ({
        id: w.id,
        planId: w.planId,
        dayOfWeek: w.dayOfWeek,
        weekNumber: w.weekNumber,
        scheduledDate: w.scheduledDate,
        targetDurationMinutes: w.targetDurationMinutes,
        prescribedCategories: w.prescribedCategoryIds
          .map(toCat)
          .filter((c): c is NonNullable<typeof c> => c !== null),
        completed: w.completed,
        planStatus: planMap.get(w.planId)?.status ?? "active",
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get today's workouts");
    res.status(500).json({ error: "Internal server error" });
  }
});

const completeSchema = z.object({ completed: z.boolean() });

// PATCH /api/workouts/:id/complete
router.patch("/:id/complete", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const id = String(req.params.id);

  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    // Verify ownership via plan
    const [workout] = await db
      .select()
      .from(dailyWorkoutsTable)
      .where(eq(dailyWorkoutsTable.id, id))
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    const [plan] = await db
      .select()
      .from(workoutPlansTable)
      .where(and(eq(workoutPlansTable.id, workout.planId), eq(workoutPlansTable.userId, userId)))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    const [updated] = await db
      .update(dailyWorkoutsTable)
      .set({ completed: parsed.data.completed, updatedAt: new Date() })
      .where(eq(dailyWorkoutsTable.id, id))
      .returning();

    // Fetch categories
    const categories =
      updated.prescribedCategoryIds.length > 0
        ? await db
            .select()
            .from(categoriesTable)
            .where(inArray(categoriesTable.id, updated.prescribedCategoryIds))
        : [];
    const categoryMap2 = new Map<string, Category>(categories.map((c) => [c.id, c]));
    const toCat2 = (cid: string) => {
      const c = categoryMap2.get(cid);
      return c ? { id: c.id, parentModality: c.parentModality, subCategory: c.subCategory } : null;
    };

    res.json({
      id: updated.id,
      planId: updated.planId,
      dayOfWeek: updated.dayOfWeek,
      weekNumber: updated.weekNumber,
      scheduledDate: updated.scheduledDate,
      targetDurationMinutes: updated.targetDurationMinutes,
      prescribedCategories: updated.prescribedCategoryIds
        .map(toCat2)
        .filter((c): c is NonNullable<typeof c> => c !== null),
      completed: updated.completed,
      planStatus: plan.status,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to complete workout");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
