import { pgTable, text, jsonb, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  preferredModalities: text("preferred_modalities").array().default([]).notNull(),
  dislikedModalities: text("disliked_modalities").array().default([]).notNull(),
  availableResources: text("available_resources").array().default([]).notNull(),
  athleteStatus: text("athlete_status"),
  scheduleMatrix: jsonb("schedule_matrix"),
  intake: jsonb("intake").$type<Record<string, unknown>>(),
  intakeDraft: jsonb("intake_draft").$type<Record<string, unknown>>(),
  intakeStep: integer("intake_step").notNull().default(0),
  intakeRevision: integer("intake_revision").notNull().default(0),
  intakeVersion: integer("intake_version").notNull().default(1),
  onboardingRequired: boolean("onboarding_required").notNull().default(true),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
