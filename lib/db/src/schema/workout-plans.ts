import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const workoutPlansTable = pgTable("workout_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  mesocycleDurationWeeks: integer("mesocycle_duration_weeks").notNull(),
  status: text("status").notNull().default("active"),
  prescribedCategoryIds: text("prescribed_category_ids").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertWorkoutPlan = typeof workoutPlansTable.$inferInsert;
export type WorkoutPlan = typeof workoutPlansTable.$inferSelect;
