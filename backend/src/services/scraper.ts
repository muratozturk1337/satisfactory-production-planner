import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

const WIKI_URL = "https://satisfactory.wiki.gg/wiki/Recipes";

interface RecipeItem {
  item: string;
  amount: number;
  ratePerMin: number;
}

export interface ScrapedRecipe {
  id: string;
  name: string;
  machine: string;
  duration: number;
  isAlternate: boolean;
  inputs: RecipeItem[];
  outputs: RecipeItem[];
  unlockedBy: string;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function parseItems(cell: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): RecipeItem[] {
  const items: RecipeItem[] = [];

  cell.find(".recipe-item").each((_i, el) => {
    const name = $(el).find(".item-name").text().trim();
    const amountText = $(el).find(".item-amount").text().replace("×", "").trim();
    const rateText = $(el).find(".item-minute").text().replace("/min", "").replace("/ min", "").trim();

    const amount = parseFloat(amountText);
    const ratePerMin = parseFloat(rateText);

    if (name && !isNaN(amount) && !isNaN(ratePerMin)) {
      items.push({ item: name, amount, ratePerMin });
    }
  });

  return items;
}

export async function scrapeRecipes(): Promise<ScrapedRecipe[]> {
  console.log("Fetching wiki...");
  const html = await fetch(WIKI_URL, {
    headers: { "User-Agent": "SatisfactoryProductionPlanner/1.0" },
  }).then((r) => r.text());

  const $ = cheerio.load(html);
  const results: ScrapedRecipe[] = [];

  $("table.recipetable tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 4) return;

    const nameCell = cells.eq(0);
    const name = nameCell.contents().first().text().trim();
    if (!name) return;

    const isAlternate = nameCell.find(".recipe-alternate").length > 0;
    const inputs = parseItems(cells.eq(1), $);
    const machine = cells.eq(2).find("a").first().text().trim();
    const durationText = cells.eq(2).text().replace(machine, "").replace("sec", "").trim();
    const duration = parseFloat(durationText);
    const outputs = parseItems(cells.eq(3), $);
    const unlockedBy = cells.eq(4)?.text().trim() || "Unknown";

    if (!name || !machine || inputs.length === 0 || outputs.length === 0 || isNaN(duration)) return;

    results.push({
      id: slugify(name) + (isAlternate ? "_alt" : ""),
      name,
      machine,
      duration,
      isAlternate,
      inputs,
      outputs,
      unlockedBy,
    });
  });

  console.log(`Scraped ${results.length} recipes`);
  return results;
}
