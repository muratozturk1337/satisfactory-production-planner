import solver from "javascript-lp-solver";
import type { Model as LpModel, Solution as LpSolution } from "javascript-lp-solver";
import type { AlternateOption, InputItem, TreeNode, TreePreviewResult } from "../../../shared/planner";
import { RAW_MATERIALS } from "../../../shared/planner";

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

interface ItemSource {
  kind: "supply" | "recipe";
  item: string;
  ratePerMin: number;
  recipe?: Recipe;
}

interface SolveContext {
  normalizedInputs: InputItem[];
  outputPerMin: number;
  recipeUsage: Map<string, number>;
  supplyUsage: Map<string, number>;
  selectedRecipes: Recipe[];
  relevantItems: Set<string>;
  feasible: boolean;
}

const EPSILON = 1e-6;
const SUPPLY_ACTIVITY_WEIGHT = 0.001;
const WASTE_ACTIVITY_WEIGHT = 0.01;
const RECIPE_ACTIVITY_WEIGHT = 1;

function parseItems(value: string): RecipeItem[] {
  return JSON.parse(value) as RecipeItem[];
}

function normalizeInputs(inputs: InputItem[]): InputItem[] {
  const merged = new Map<string, number>();

  for (const input of inputs) {
    const item = input.item.trim();
    if (!item) continue;
    merged.set(item, (merged.get(item) ?? 0) + Math.max(0, input.ratePerMin));
  }

  return [...merged.entries()]
    .map(([item, ratePerMin]) => ({ item, ratePerMin }))
    .filter((input) => input.ratePerMin > EPSILON);
}

function getRecipeInputs(recipe: Recipe): RecipeItem[] {
  return parseItems(recipe.inputs);
}

function getRecipeOutputs(recipe: Recipe): RecipeItem[] {
  return parseItems(recipe.outputs);
}

function getRecipeOutputItems(recipe: Recipe): string[] {
  return getRecipeOutputs(recipe).map((output) => output.item);
}

function getEnabledRecipes(recipes: Recipe[], activeAlternates: string[]): Recipe[] {
  return recipes.filter((recipe) => !recipe.isAlternate || activeAlternates.includes(recipe.id));
}

function collectRelevantItems(targetItem: string, recipes: Recipe[]): Set<string> {
  const relevantItems = new Set<string>([targetItem]);
  const queue = [targetItem];

  while (queue.length > 0) {
    const item = queue.shift()!;

    for (const recipe of recipes) {
      if (!getRecipeOutputItems(recipe).includes(item)) continue;

      for (const input of getRecipeInputs(recipe)) {
        if (relevantItems.has(input.item)) continue;
        relevantItems.add(input.item);
        queue.push(input.item);
      }
    }
  }

  return relevantItems;
}

function createVariable(name: string, variables: LpModel["variables"]): NonNullable<LpModel["variables"]>[string] {
  const existing = variables[name];
  if (existing) return existing;

  const created: NonNullable<LpModel["variables"]>[string] = {};
  variables[name] = created;
  return created;
}

function buildModel(
  targetItem: string,
  normalizedInputs: InputItem[],
  relevantItems: Set<string>,
  relevantRecipes: Recipe[],
  options:
    | { mode: "max_output" }
    | { mode: "min_activity"; requiredOutputPerMin: number }
): LpModel {
  const model: LpModel = {
    optimize: options.mode === "max_output" ? "objective" : "activity",
    opType: options.mode === "max_output" ? "max" : "min",
    constraints: {},
    variables: {},
  };

  for (const item of relevantItems) {
    model.constraints[`balance:${item}`] = { equal: 0 };
  }

  for (const input of normalizedInputs) {
    model.constraints[`supply_limit:${input.item}`] = { max: input.ratePerMin };
  }

  if (options.mode === "min_activity") {
    model.constraints.output_required = { equal: options.requiredOutputPerMin };
  }

  for (const recipe of relevantRecipes) {
    const variable = createVariable(`recipe:${recipe.id}`, model.variables);

    if (options.mode === "min_activity") {
      variable.activity = RECIPE_ACTIVITY_WEIGHT;
    }

    for (const output of getRecipeOutputs(recipe)) {
      if (!relevantItems.has(output.item)) continue;
      variable[`balance:${output.item}`] = (variable[`balance:${output.item}`] ?? 0) + output.ratePerMin;
    }

    for (const input of getRecipeInputs(recipe)) {
      if (!relevantItems.has(input.item)) continue;
      variable[`balance:${input.item}`] = (variable[`balance:${input.item}`] ?? 0) - input.ratePerMin;
    }
  }

  for (const input of normalizedInputs) {
    const variable = createVariable(`supply:${input.item}`, model.variables);
    variable[`balance:${input.item}`] = (variable[`balance:${input.item}`] ?? 0) + 1;
    variable[`supply_limit:${input.item}`] = 1;

    if (options.mode === "min_activity") {
      variable.activity = SUPPLY_ACTIVITY_WEIGHT;
    }
  }

  for (const item of relevantItems) {
    const wasteVariable = createVariable(`waste:${item}`, model.variables);
    wasteVariable[`balance:${item}`] = -1;

    if (options.mode === "min_activity") {
      wasteVariable.activity = WASTE_ACTIVITY_WEIGHT;
    }
  }

  const outputVariable = createVariable(`output:${targetItem}`, model.variables);
  outputVariable[`balance:${targetItem}`] = -1;

  if (options.mode === "max_output") {
    outputVariable.objective = 1;
  } else {
    outputVariable.output_required = 1;
  }

  return model;
}

function extractSolutionContext(
  solution: LpSolution<string>,
  normalizedInputs: InputItem[],
  relevantRecipes: Recipe[],
  relevantItems: Set<string>,
  targetItem: string
): SolveContext {
  const recipeUsage = new Map<string, number>();
  for (const recipe of relevantRecipes) {
    const value = solution[`recipe:${recipe.id}`];
    if (typeof value === "number" && value > EPSILON) {
      recipeUsage.set(recipe.id, value);
    }
  }

  const supplyUsage = new Map<string, number>();
  for (const input of normalizedInputs) {
    const value = solution[`supply:${input.item}`];
    if (typeof value === "number" && value > EPSILON) {
      supplyUsage.set(input.item, value);
    }
  }

  const explicitOutput = solution[`output:${targetItem}`];
  const outputPerMin = typeof explicitOutput === "number" ? explicitOutput : Math.max(0, solution.result ?? 0);

  return {
    normalizedInputs,
    outputPerMin,
    recipeUsage,
    supplyUsage,
    selectedRecipes: relevantRecipes,
    relevantItems,
    feasible: true,
  };
}

function solveMaxOutput(
  targetItem: string,
  inputs: InputItem[],
  recipes: Recipe[],
  activeAlternates: string[] = []
): SolveContext {
  const normalizedInputs = normalizeInputs(inputs);
  const enabledRecipes = getEnabledRecipes(recipes, activeAlternates);
  const relevantItems = collectRelevantItems(targetItem, enabledRecipes);
  normalizedInputs.forEach((input) => relevantItems.add(input.item));

  const relevantRecipes = enabledRecipes.filter((recipe) => {
    const outputs = getRecipeOutputs(recipe);
    const inputsForRecipe = getRecipeInputs(recipe);
    return outputs.some((output) => relevantItems.has(output.item)) || inputsForRecipe.some((input) => relevantItems.has(input.item));
  });

  const maxOutputModel = buildModel(targetItem, normalizedInputs, relevantItems, relevantRecipes, { mode: "max_output" });
  const maxOutputSolution = solver.Solve<string>(maxOutputModel) as LpSolution<string>;

  if (!maxOutputSolution.feasible) {
    return {
      normalizedInputs,
      outputPerMin: 0,
      recipeUsage: new Map(),
      supplyUsage: new Map(),
      selectedRecipes: relevantRecipes,
      relevantItems,
      feasible: false,
    };
  }

  const maxOutput = (() => {
    const explicitOutput = maxOutputSolution[`output:${targetItem}`];
    return typeof explicitOutput === "number" ? explicitOutput : Math.max(0, maxOutputSolution.result ?? 0);
  })();

  if (maxOutput <= EPSILON) {
    return {
      normalizedInputs,
      outputPerMin: 0,
      recipeUsage: new Map(),
      supplyUsage: new Map(),
      selectedRecipes: relevantRecipes,
      relevantItems,
      feasible: true,
    };
  }

  const minActivityModel = buildModel(targetItem, normalizedInputs, relevantItems, relevantRecipes, {
    mode: "min_activity",
    requiredOutputPerMin: maxOutput,
  });
  const minActivitySolution = solver.Solve<string>(minActivityModel) as LpSolution<string>;

  if (minActivitySolution.feasible) {
    return extractSolutionContext(minActivitySolution, normalizedInputs, relevantRecipes, relevantItems, targetItem);
  }

  return extractSolutionContext(maxOutputSolution, normalizedInputs, relevantRecipes, relevantItems, targetItem);
}

function getSourcesForItem(
  itemName: string,
  recipes: Recipe[],
  recipeUsage: Map<string, number>,
  supplyUsage: Map<string, number>
): ItemSource[] {
  const sources: ItemSource[] = [];
  const suppliedRate = supplyUsage.get(itemName) ?? 0;

  if (suppliedRate > EPSILON) {
    sources.push({ kind: "supply", item: itemName, ratePerMin: suppliedRate });
  }

  for (const recipe of recipes) {
    const usage = recipeUsage.get(recipe.id);
    if (!usage || usage <= EPSILON) continue;

    const output = getRecipeOutputs(recipe).find((entry) => entry.item === itemName);
    if (!output) continue;

    const ratePerMin = output.ratePerMin * usage;
    if (ratePerMin <= EPSILON) continue;

    sources.push({
      kind: "recipe",
      item: itemName,
      ratePerMin,
      recipe,
    });
  }

  return sources;
}

function buildSupplyNode(itemName: string, ratePerMin: number): TreeNode {
  return {
    recipeName: "",
    machine: RAW_MATERIALS.has(itemName) ? "Raw" : "Input",
    outputItem: itemName,
    outputPerMin: ratePerMin,
    machinesExact: 0,
    machinesCeil: 0,
    children: [],
  };
}

function buildRecipeNode(
  recipe: Recipe,
  outputItem: string,
  ratePerMin: number,
  recipes: Recipe[],
  recipeUsage: Map<string, number>,
  supplyUsage: Map<string, number>,
  visitedItems: Set<string>
): TreeNode | null {
  const output = getRecipeOutputs(recipe).find((entry) => entry.item === outputItem);
  if (!output || output.ratePerMin <= EPSILON) return null;

  const machinesExact = ratePerMin / output.ratePerMin;
  const children: TreeNode[] = [];

  for (const input of getRecipeInputs(recipe)) {
    const inputRate = (input.ratePerMin / output.ratePerMin) * ratePerMin;
    const child = buildTreeFromSolution(input.item, inputRate, recipes, recipeUsage, supplyUsage, visitedItems);
    if (child) children.push(child);
  }

  return {
    recipeName: recipe.name,
    machine: recipe.machine,
    outputItem,
    outputPerMin: ratePerMin,
    machinesExact,
    machinesCeil: Math.ceil(machinesExact),
    children,
  };
}

function buildTreeFromSolution(
  itemName: string,
  ratePerMin: number,
  recipes: Recipe[],
  recipeUsage: Map<string, number>,
  supplyUsage: Map<string, number>,
  visitedItems = new Set<string>()
): TreeNode | null {
  if (ratePerMin <= EPSILON) return null;
  if (visitedItems.has(itemName)) return buildSupplyNode(itemName, ratePerMin);

  const sources = getSourcesForItem(itemName, recipes, recipeUsage, supplyUsage);

  if (sources.length === 0) {
    return buildSupplyNode(itemName, ratePerMin);
  }

  if (sources.length === 1) {
    const [source] = sources;

    if (source.kind === "supply") {
      return buildSupplyNode(itemName, ratePerMin);
    }

    const nextVisited = new Set(visitedItems);
    nextVisited.add(itemName);
    return buildRecipeNode(source.recipe!, itemName, ratePerMin, recipes, recipeUsage, supplyUsage, nextVisited);
  }

  const totalAvailable = sources.reduce((sum, source) => sum + source.ratePerMin, 0);
  if (totalAvailable <= EPSILON) return buildSupplyNode(itemName, ratePerMin);

  const nextVisited = new Set(visitedItems);
  nextVisited.add(itemName);

  const children = sources
    .map((source) => {
      const share = (source.ratePerMin / totalAvailable) * ratePerMin;

      if (source.kind === "supply") {
        return buildSupplyNode(itemName, share);
      }

      return buildRecipeNode(source.recipe!, itemName, share, recipes, recipeUsage, supplyUsage, nextVisited);
    })
    .filter((node): node is TreeNode => node !== null);

  return {
    recipeName: "",
    machine: "Mixed",
    outputItem: itemName,
    outputPerMin: ratePerMin,
    machinesExact: 0,
    machinesCeil: 0,
    children,
  };
}

function createResult(
  targetItem: string,
  context: SolveContext
): TreePreviewResult {
  const tree = context.outputPerMin > EPSILON
    ? buildTreeFromSolution(targetItem, context.outputPerMin, context.selectedRecipes, context.recipeUsage, context.supplyUsage)
    : null;

  return {
    targetItem,
    outputPerMin: context.outputPerMin,
    inputs: context.normalizedInputs,
    tree,
    missingInputs: [],
  };
}

export function getRelevantAlternates(
  targetItem: string,
  inputs: InputItem[],
  recipes: Recipe[],
  activeAlternates: string[] = []
): AlternateOption[] {
  return recipes
    .filter((recipe) => recipe.isAlternate)
    .map((recipe) => {
      const outputs = getRecipeOutputs(recipe);
      const outputItem = outputs[0]?.item ?? recipe.name;
      const scenarioAlternates = [...activeAlternates.filter((id) => id !== recipe.id), recipe.id];
      const result = solveMaxOutput(targetItem, inputs, recipes, scenarioAlternates);
      const isUsed = (result.recipeUsage.get(recipe.id) ?? 0) > EPSILON;

      return {
        id: recipe.id,
        name: recipe.name,
        outputItem,
        isFeasible: result.outputPerMin > EPSILON && isUsed,
        missingInputs: [],
      };
    })
    .filter((recipe) => recipe.isFeasible)
    .sort((left, right) => {
      if (left.outputItem !== right.outputItem) return left.outputItem.localeCompare(right.outputItem);
      return left.name.localeCompare(right.name);
    });
}

export function previewTree(
  targetItem: string,
  inputs: InputItem[],
  recipes: Recipe[],
  activeAlternates: string[] = []
): TreePreviewResult {
  return createResult(targetItem, solveMaxOutput(targetItem, inputs, recipes, activeAlternates));
}
