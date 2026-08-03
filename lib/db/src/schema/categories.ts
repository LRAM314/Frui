import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  parentModality: text("parent_modality").notNull(),
  subCategory: text("sub_category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertCategory = typeof categoriesTable.$inferInsert;
export type Category = typeof categoriesTable.$inferSelect;
