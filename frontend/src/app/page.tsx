"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { AlternateOption, InputItem, TreeNode, TreePreviewResult } from "../../../shared/planner";

interface EditableInput {
  item: string;
  ratePerMin: string;
}

function ItemSearch({
  value,
  items,
  onSelect,
  placeholder,
}: {
  value: string;
  items: string[];
  onSelect: (item: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => { setSearch(value); }, [value]);

  const filtered = items.filter((i) => i.toLowerCase().includes(search.toLowerCase()));

  function handleFocus() {
    setSearch("");
    setOpen(true);
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);
      setSearch(value); // restore selected value if nothing was picked
    }, 150);
  }

  return (
    <div className="relative w-full">
      <Input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={value || (placeholder ?? "Search...")}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md max-h-52 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(item); setSearch(item); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted ${item === value ? "bg-muted font-medium" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductionTreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isLeaf = node.machinesCeil === 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 ${isLeaf ? "text-muted-foreground" : ""}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-4 shrink-0 text-muted-foreground"
        >
          {hasChildren ? (expanded ? "▾" : "▸") : "·"}
        </button>
        <span className={isLeaf ? "" : "font-medium"}>{node.outputItem}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground text-xs italic">{node.machine}</span>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{node.outputPerMin.toFixed(2)}/min</span>
          {!isLeaf && <span className="font-medium text-foreground">{node.machinesCeil}×</span>}
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 border-l border-border/50"
            style={{ left: `${depth * 20 + 16}px` }}
          />
          {node.children.map((child, i) => (
            <ProductionTreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlannerPage() {
  const [hydrated, setHydrated] = useState(false);
  const [targetItem, setTargetItem] = useState("");
  const [inputs, setInputs] = useState<EditableInput[]>([{ item: "Iron Ore", ratePerMin: "30" }]);
  const [activeAlternates, setActiveAlternates] = useState<string[]>([]);
  const [availableAlternates, setAvailableAlternates] = useState<AlternateOption[]>([]);
  const [allItems, setAllItems] = useState<string[]>([]);
  const [resourceItems, setResourceItems] = useState<string[]>([]);
  const [result, setResult] = useState<TreePreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  function getRequestInputs(): InputItem[] {
    return inputs
      .map((input) => ({ item: input.item, ratePerMin: Number(input.ratePerMin) }))
      .filter((input) => !Number.isNaN(input.ratePerMin) && input.ratePerMin >= 0);
  }

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/planner/items")
      .then((r) => r.json())
      .then(setAllItems)
      .catch(console.error);
    fetch("/api/planner/resources")
      .then((r) => r.json())
      .then(setResourceItems)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!targetItem) {
      setAvailableAlternates((previous) => (previous.length === 0 ? previous : []));
      setActiveAlternates((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    fetch("/api/planner/alternates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetItem, inputs: getRequestInputs() }),
    })
      .then((r) => r.json())
      .then((alternates: AlternateOption[]) => {
        setAvailableAlternates(alternates);
        setActiveAlternates((previous) => {
          const next = previous.filter((id) => alternates.some((alternate) => alternate.id === id));
          return next.length === previous.length && next.every((id, index) => id === previous[index]) ? previous : next;
        });
      })
      .catch(console.error);
  }, [targetItem, inputs]);

  function toggleAlternate(id: string) {
    setActiveAlternates((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
    setResult(null);
  }

  function updateInputItem(index: number, item: string) {
    setInputs((prev) => prev.map((inp, i) => i === index ? { ...inp, item } : inp));
    setResult(null);
  }

  function updateInputRate(index: number, ratePerMin: string) {
    setInputs((prev) => prev.map((inp, i) => i === index ? { ...inp, ratePerMin } : inp));
    setResult(null);
  }

  function commitInputRateDraft(index: number) {
    setInputs((prev) =>
      prev.map((input, i) => {
        if (i !== index) return input;
        if (input.ratePerMin === "") return { ...input, ratePerMin: "0" };

        const parsed = Number(input.ratePerMin);
        return Number.isNaN(parsed) || parsed < 0 ? { ...input, ratePerMin: "0" } : { ...input, ratePerMin: String(parsed) };
      })
    );
  }

  function addInput() {
    setInputs((prev) => [...prev, { item: "Iron Ore", ratePerMin: "30" }]);
    setResult(null);
  }

  function removeInput(index: number) {
    setInputs((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  async function calculate() {
    setLoading(true);
    const res = await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetItem, inputs: getRequestInputs(), activeAlternates }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  const isCalculateDisabled = !hydrated || loading || !targetItem;

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Inputs</label>
          <div className="space-y-2">
            {inputs.map((input, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <ItemSearch
                    value={input.item}
                    items={resourceItems}
                    onSelect={(item) => updateInputItem(index, item)}
                    placeholder="Item..."
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  value={input.ratePerMin}
                  onChange={(e) => updateInputRate(index, e.target.value)}
                  onBlur={() => commitInputRateDraft(index)}
                  className="w-24 shrink-0"
                />
                <span className="text-xs text-muted-foreground shrink-0">/min</span>
                {inputs.length > 1 && (
                  <button
                    onClick={() => removeInput(index)}
                    className="shrink-0 text-muted-foreground hover:text-foreground text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addInput}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              + Add input
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">What do you want to produce?</label>
          <div className="max-w-xs">
            <ItemSearch
              value={targetItem}
              items={allItems}
              onSelect={(item) => { setTargetItem(item); setResult(null); }}
              placeholder="Search items..."
            />
          </div>
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
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:border-primary/50"
                }`}
              >
                {alt.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={isCalculateDisabled}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Calculate"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">Max output</p>
            <p className="text-3xl font-bold">
              {result.outputPerMin.toFixed(2)}
              <span className="text-base font-normal text-muted-foreground ml-1">{result.targetItem} / min</span>
            </p>
          </div>

          {result.missingInputs.length > 0 && (
            <div className="rounded-md border border-red-400/50 bg-red-400/5 p-4">
              <p className="text-sm font-medium text-red-400">Missing inputs</p>
              <p className="text-sm text-muted-foreground mt-1">
                This tree still depends on these raw inputs:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.missingInputs.map((item) => (
                  <span key={item} className="rounded-md border border-red-400/40 px-2 py-0.5 text-xs text-red-400">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.tree && (
            <div className="rounded-md border">
              <p className="px-4 py-2 text-sm font-medium border-b">
                Production tree
              </p>
              <div className="py-1">
                <ProductionTreeNode node={result.tree} depth={0} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
