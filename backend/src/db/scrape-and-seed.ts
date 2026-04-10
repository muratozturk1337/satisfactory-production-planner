import { db } from "./index";
import { recipes } from "./schema";
import { scrapeRecipes } from "../services/scraper";

async function main() {
  const scraped = await scrapeRecipes();

  let inserted = 0;
  for (const r of scraped) {
    const result = db.insert(recipes).values({
      id: r.id,
      name: r.name,
      machine: r.machine,
      duration: r.duration,
      isAlternate: r.isAlternate,
      inputs: JSON.stringify(r.inputs),
      outputs: JSON.stringify(r.outputs),
      unlockedBy: r.unlockedBy,
    }).onConflictDoNothing().run();

    if (result.changes > 0) inserted++;
  }

  console.log(`Done — inserted ${inserted} of ${scraped.length} recipes`);
}

main().catch(console.error);
