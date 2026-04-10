"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface AlternateOption {
  id: string;
  name: string;
  outputItem: string;
  isOptimal: boolean;
}

const ITEMS = [
  "Screws",
  "Iron Rod",
  "Iron Plate",
  "Reinforced Iron Plate",
  "Modular Frame",
  "Iron Ingot",
];

interface ProductionStep {
  recipeName: string;
  machine: string;
  outputItem: string;
  outputPerMin: number;
  machinesExact: number;
  machinesCeil: number;
}

interface Result {
  targetItem: string;
  outputPerMin: number;
  ironOreUsed: number;
  steps: ProductionStep[];
}

export default function PlannerPage() {
  const [mode, setMode] = useState<"max_output">("max_output");
  const [ironOre, setIronOre] = useState(120);
  const [targetItem, setTargetItem] = useState("Screws");
  const [activeAlternates, setActiveAlternates] = useState<string[]>([]);
  const [availableAlternates, setAvailableAlternates] = useState<AlternateOption[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveAlternates([]);
    fetch(`/api/calculate/alternates/${encodeURIComponent(targetItem)}`)
      .then((r) => r.json())
      .then(setAvailableAlternates)
      .catch(console.error);
  }, [targetItem]);

  function toggleAlternate(id: string) {
    setActiveAlternates((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  async function calculate() {
    setLoading(true);
    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetItem, ironOrePerMin: ironOre, activeAlternates, mode }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Calculation mode</label>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-primary bg-primary/10 px-3 py-1 text-sm text-primary"
            >
              Max Output
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Iron Ore per minute</label>
          <Input
            type="number"
            min={1}
            value={ironOre}
            onChange={(e) => setIronOre(Number(e.target.value))}
            className="max-w-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">What do you want to produce?</label>
          <select
            value={targetItem}
            onChange={(e) => setTargetItem(e.target.value)}
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {ITEMS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Alternate recipes</label>
          <div className="flex flex-wrap gap-2">
            {availableAlternates.length === 0 && (
              <span className="text-sm text-muted-foreground">None available</span>
            )}
            {availableAlternates.map((alt) => (
              <button
                key={alt.id}
                onClick={() => toggleAlternate(alt.id)}
                className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                  activeAlternates.includes(alt.id)
                    ? alt.isOptimal
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-red-400 bg-red-400/10 text-red-400"
                    : alt.isOptimal
                      ? "border-input text-muted-foreground hover:border-primary/50"
                      : "border-red-400/40 text-red-400/60 hover:border-red-400"
                }`}
              >
                {alt.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Calculate"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">Max output</p>
            <p className="text-3xl font-bold">{result.outputPerMin.toFixed(2)}<span className="text-base font-normal text-muted-foreground ml-1">{result.targetItem} / min</span></p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Production steps</p>
            {result.steps.map((step, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border px-4 py-2 text-sm">
                <div>
                  <span className="font-medium">{step.outputItem}</span>
                  <span className="text-muted-foreground ml-2">{step.machine}</span>
                </div>
                <div className="text-right text-muted-foreground">
                  <span>{step.outputPerMin.toFixed(2)}/min</span>
                  <span className="ml-3 font-medium text-foreground">{step.machinesCeil} machines</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
