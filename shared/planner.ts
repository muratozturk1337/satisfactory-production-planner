export interface InputItem {
  item: string;
  ratePerMin: number;
}

export interface TreeNode {
  recipeName: string;
  machine: string;
  outputItem: string;
  outputPerMin: number;
  machinesExact: number;
  machinesCeil: number;
  children: TreeNode[];
}

export interface TreePreviewResult {
  targetItem: string;
  outputPerMin: number;
  inputs: InputItem[];
  tree: TreeNode | null;
  missingInputs: string[];
}

export interface AlternateOption {
  id: string;
  name: string;
  outputItem: string;
  isFeasible: boolean;
  missingInputs: string[];
}

export const RAW_MATERIALS = new Set([
  "Iron Ore",
  "Copper Ore",
  "Limestone",
  "Coal",
  "Caterium Ore",
  "Raw Quartz",
  "Sulfur",
  "Bauxite",
  "SAM",
  "Uranium",
  "Water",
  "Crude Oil",
  "Nitrogen Gas",
  "Leaves",
  "Wood",
  "Mycelia",
  "Blue Power Slug",
  "Yellow Power Slug",
  "Purple Power Slug",
  "Hog Remains",
  "Hatcher Remains",
  "Spitter Remains",
  "Stinger Remains",
  "FICSMAS Gift",
]);
