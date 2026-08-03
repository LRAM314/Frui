import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router = Router();

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.parentModality), asc(categoriesTable.subCategory));

    res.json(
      categories.map((c) => ({
        id: c.id,
        parentModality: c.parentModality,
        subCategory: c.subCategory,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
