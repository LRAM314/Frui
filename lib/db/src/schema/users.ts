import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  preferredModalities: text("preferred_modalities").array().default([]).notNull(),
  dislikedModalities: text("disliked_modalities").array().default([]).notNull(),
  availableResources: text("available_resources").array().default([]).notNull(),
  athleteStatus: text("athlete_status"),
  scheduleMatrix: jsonb("schedule_matrix"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
