import { Router } from "express";
import { db } from "../db";
import { recipes } from "../db/schema";
import { getRelevantAlternates, previewTree } from "../services/planner";
import type { InputItem } from "../../../shared/planner";
import { RAW_MATERIALS } from "../../../shared/planner";

const router = Router();

router.get("/items", async (_req, res) => {
  const allRecipes = await db.select().from(recipes);
  const items = new Set<string>();
  for (const recipe of allRecipes) {
    if (!recipe.isAlternate) {
      const outputs: { item: string }[] = JSON.parse(recipe.outputs);
      for (const output of outputs) {
        if (!RAW_MATERIALS.has(output.item)) items.add(output.item);
      }
    }
  }
  res.json([...items].sort());
});

router.get("/resources", async (_req, res) => {
  const allRecipes = await db.select().from(recipes);
  const items = new Set<string>(RAW_MATERIALS);
  for (const recipe of allRecipes) {
    if (!recipe.isAlternate) {
      const outputs: { item: string }[] = JSON.parse(recipe.outputs);
      for (const output of outputs) items.add(output.item);
    }
  }
  res.json([...items].sort());
});

router.post("/alternates", async (req, res) => {
  const { targetItem, inputs = [], activeAlternates = [] } = req.body;

  if (!targetItem) {
    res.status(400).json({ error: "targetItem is required" });
    return;
  }

  const allRecipes = await db.select().from(recipes);
  const alternates = getRelevantAlternates(targetItem, inputs as InputItem[], allRecipes, activeAlternates);
  res.json(alternates);
});

router.post("/", async (req, res) => {
  const { targetItem, inputs = [], activeAlternates = [] } = req.body;

  if (!targetItem) {
    res.status(400).json({ error: "targetItem is required" });
    return;
  }

  const allRecipes = await db.select().from(recipes);
  const result = previewTree(targetItem, inputs as InputItem[], allRecipes, activeAlternates);

  res.json(result);
});

export default router;
