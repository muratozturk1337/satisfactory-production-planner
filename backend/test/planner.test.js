const assert = require("node:assert/strict");
const { db } = require("../dist/backend/src/db");
const { recipes } = require("../dist/backend/src/db/schema");
const { getRelevantAlternates, previewTree } = require("../dist/backend/src/services/planner");

async function run() {
  const allRecipes = await db.select().from(recipes);

  {
    const result = previewTree("Screws", [{ item: "Iron Ore", ratePerMin: 120 }], allRecipes, []);
    assert.equal(result.outputPerMin, 480);
    assert.equal(result.tree?.outputItem, "Screws");
    assert.equal(result.tree?.machine, "Constructor");
  }

  {
    const result = previewTree(
      "Screws",
      [
        { item: "Iron Rod", ratePerMin: 60 },
        { item: "Iron Ore", ratePerMin: 30 },
      ],
      allRecipes,
      []
    );
    assert.equal(result.outputPerMin, 360);
    assert.equal(result.tree?.outputItem, "Screws");
  }

  {
    const alternates = getRelevantAlternates("Screws", [{ item: "Iron Ore", ratePerMin: 120 }], allRecipes, []);
    assert.deepEqual(
      alternates.map((alternate) => alternate.name),
      ["Cast Screws"]
    );
  }

  console.log("planner smoke tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
