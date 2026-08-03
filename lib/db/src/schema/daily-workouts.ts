import { pgTable, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { workoutPlansTable } from "./workout-plans";

export const dailyWorkoutsTable = pgTable("daily_workouts", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .references(() => workoutPlansTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  weekNumber: integer("week_number").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  targetDurationMinutes: integer("target_duration_minutes").notNull().default(60),
  prescribedCategoryIds: text("prescribed_category_ids").array().default([]).notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertDailyWorkout = typeof dailyWorkoutsTable.$inferInsert;
export type DailyWorkout = typeof dailyWorkoutsTable.$inferSelect;
