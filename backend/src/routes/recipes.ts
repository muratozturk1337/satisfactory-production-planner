import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { recipes } from "../db/schema";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db.select().from(recipes);
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const row = await db.select().from(recipes).where(eq(recipes.id, req.params.id));
  if (row.length === 0) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  res.json(row[0]);
});

export default router;
