import { Router } from "express";
import { db } from "../db";
import { recipes } from "../db/schema";
import { calculate, getRelevantAlternates } from "../services/calculator";

const router = Router();

router.get("/alternates/:targetItem", async (req, res) => {
  const allRecipes = await db.select().from(recipes);
  const alternates = getRelevantAlternates(req.params.targetItem, allRecipes);
  res.json(alternates);
});

router.post("/", async (req, res) => {
  const { targetItem, ironOrePerMin, activeAlternates = [], mode = "max_output" } = req.body;

  if (!targetItem || !ironOrePerMin) {
    res.status(400).json({ error: "targetItem and ironOrePerMin are required" });
    return;
  }

  const allRecipes = await db.select().from(recipes);

  // In max_output mode, silently drop alternates that reduce output
  let effectiveAlternates = activeAlternates;
  if (mode === "max_output") {
    const available = getRelevantAlternates(targetItem, allRecipes);
    effectiveAlternates = activeAlternates.filter((id: string) =>
      available.find((a) => a.id === id)?.isOptimal
    );
  }

  const result = calculate(targetItem, Number(ironOrePerMin), allRecipes, effectiveAlternates);

  res.json(result);
});

export default router;
