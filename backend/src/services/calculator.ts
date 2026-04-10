interface RecipeItem {
  item: string;
  amount: number;
  ratePerMin: number;
}

interface Recipe {
  id: string;
  name: string;
  machine: string;
  duration: number;
  isAlternate: boolean;
  inputs: string;
  outputs: string;
  unlockedBy: string;
}

export interface ProductionStep {
  recipeName: string;
  machine: string;
  outputItem: string;
  outputPerMin: number;
  machinesExact: number;
  machinesCeil: number;
}

export interface CalculationResult {
  targetItem: string;
  outputPerMin: number;
  ironOreUsed: number;
  steps: ProductionStep[];
}

function findRecipe(itemName: string, recipes: Recipe[], activeAlternates: string[] = []): Recipe | undefined {
  // Prefer active alternate
  const alt = recipes.find((r) => {
    if (!r.isAlternate || !activeAlternates.includes(r.id)) return false;
    const outputs: RecipeItem[] = JSON.parse(r.outputs);
    return outputs.some((o) => o.item === itemName);
  });
  if (alt) return alt;

  // Fall back to standard
  return recipes.find((r) => {
    if (r.isAlternate) return false;
    const outputs: RecipeItem[] = JSON.parse(r.outputs);
    return outputs.some((o) => o.item === itemName);
  });
}

// How much iron ore per minute is needed to produce 1 unit/min of itemName
function orePerUnit(itemName: string, recipes: Recipe[], activeAlternates: string[], visited = new Set<string>()): number {
  if (itemName === "Iron Ore") return 1;
  if (visited.has(itemName)) return Infinity;

  const recipe = findRecipe(itemName, recipes, activeAlternates);
  if (!recipe) return Infinity;

  visited.add(itemName);

  const outputs: RecipeItem[] = JSON.parse(recipe.outputs);
  const inputs: RecipeItem[] = JSON.parse(recipe.inputs);

  const primaryOutput = outputs.find((o) => o.item === itemName)!;

  let totalOrePerMachine = 0;
  for (const input of inputs) {
    const orePerInputUnit = orePerUnit(input.item, recipes, activeAlternates, new Set(visited));
    totalOrePerMachine += orePerInputUnit * input.ratePerMin;
  }

  return totalOrePerMachine / primaryOutput.ratePerMin;
}

function buildSteps(
  itemName: string,
  targetRatePerMin: number,
  recipes: Recipe[],
  activeAlternates: string[],
  stepsMap: Map<string, ProductionStep>
): void {
  if (itemName === "Iron Ore") return;

  const recipe = findRecipe(itemName, recipes, activeAlternates);
  if (!recipe) return;

  const outputs: RecipeItem[] = JSON.parse(recipe.outputs);
  const inputs: RecipeItem[] = JSON.parse(recipe.inputs);
  const primaryOutput = outputs.find((o) => o.item === itemName)!;

  const existing = stepsMap.get(itemName);
  const newRate = (existing?.outputPerMin ?? 0) + targetRatePerMin;
  const machinesExact = newRate / primaryOutput.ratePerMin;

  stepsMap.set(itemName, {
    recipeName: recipe.name,
    machine: recipe.machine,
    outputItem: itemName,
    outputPerMin: newRate,
    machinesExact,
    machinesCeil: Math.ceil(machinesExact),
  });

  for (const input of inputs) {
    const inputRate = (input.ratePerMin / primaryOutput.ratePerMin) * targetRatePerMin;
    buildSteps(input.item, inputRate, recipes, activeAlternates, stepsMap);
  }
}

// Collect all item names in the production chain
function collectChainItems(itemName: string, recipes: Recipe[], visited = new Set<string>()): Set<string> {
  if (itemName === "Iron Ore" || visited.has(itemName)) return visited;
  visited.add(itemName);

  const recipe = findRecipe(itemName, recipes);
  if (!recipe) return visited;

  const inputs: RecipeItem[] = JSON.parse(recipe.inputs);
  for (const input of inputs) {
    collectChainItems(input.item, recipes, visited);
  }
  return visited;
}

export interface AlternateOption {
  id: string;
  name: string;
  outputItem: string;
  isOptimal: boolean;
}

export function getRelevantAlternates(targetItem: string, recipes: Recipe[]): AlternateOption[] {
  const chainItems = collectChainItems(targetItem, recipes);
  chainItems.add(targetItem);

  const baseOre = orePerUnit(targetItem, recipes, []);

  return recipes
    .filter((r) => {
      if (!r.isAlternate) return false;
      const outputs: RecipeItem[] = JSON.parse(r.outputs);
      if (!outputs.some((o) => chainItems.has(o.item))) return false;

      // Only include if all inputs can be resolved back to Iron Ore
      const inputs: RecipeItem[] = JSON.parse(r.inputs);
      return inputs.every((inp) => orePerUnit(inp.item, recipes, []) < Infinity);
    })
    .map((r) => {
      const outputs: RecipeItem[] = JSON.parse(r.outputs);
      const altOre = orePerUnit(targetItem, recipes, [r.id]);
      return {
        id: r.id,
        name: r.name,
        outputItem: outputs[0].item,
        isOptimal: altOre <= baseOre + 1e-9,
      };
    });
}

export function calculate(
  targetItem: string,
  ironOrePerMin: number,
  recipes: Recipe[],
  activeAlternates: string[] = []
): CalculationResult {
  const ore = orePerUnit(targetItem, recipes, activeAlternates);
  const outputPerMin = ironOrePerMin / ore;

  const stepsMap = new Map<string, ProductionStep>();
  buildSteps(targetItem, outputPerMin, recipes, activeAlternates, stepsMap);

  return {
    targetItem,
    outputPerMin,
    ironOreUsed: ironOrePerMin,
    steps: Array.from(stepsMap.values()).reverse(),
  };
}
