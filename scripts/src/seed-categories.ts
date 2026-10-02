import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { randomUUID } from "crypto";

const categories = [
  // Strength
  { parentModality: "Strength", subCategory: "Weightlifting" },
  { parentModality: "Strength", subCategory: "Calisthenics" },
  { parentModality: "Strength", subCategory: "Powerlifting" },
  // Cardio
  { parentModality: "Cardio", subCategory: "Running" },
  { parentModality: "Cardio", subCategory: "Swimming" },
  { parentModality: "Cardio", subCategory: "Cycling" },
  { parentModality: "Cardio", subCategory: "Rowing" },
  { parentModality: "Cardio", subCategory: "Sprinting" },
  // Mobility
  { parentModality: "Mobility", subCategory: "Yoga" },
  { parentModality: "Mobility", subCategory: "Stretching" },
  { parentModality: "Mobility", subCategory: "Pilates" },
];

async function seed() {
  console.log("Seeding categories...");
  const existingNames = new Set((await db.select().from(categoriesTable))
    .map((category) => `${category.parentModality}:${category.subCategory}`));

  for (const cat of categories) {
    if (existingNames.has(`${cat.parentModality}:${cat.subCategory}`)) continue;
    await db
      .insert(categoriesTable)
      .values({
        id: randomUUID(),
        parentModality: cat.parentModality,
        subCategory: cat.subCategory,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded ${categories.length} categories.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
