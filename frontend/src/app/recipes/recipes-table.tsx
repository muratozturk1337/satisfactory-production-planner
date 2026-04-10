"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatItems(json: string): string {
  const items: RecipeItem[] = JSON.parse(json);
  return items.map((i) => `${i.ratePerMin}/min ${i.item}`).join(", ");
}

export default function RecipesTable({ recipes }: { recipes: Recipe[] }) {
  const [search, setSearch] = useState("");

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipe</TableHead>
            <TableHead>Ingredients</TableHead>
            <TableHead>Produced In</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Unlocked By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((recipe) => (
            <TableRow key={recipe.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">
                <Link href={`/recipes/${recipe.id}`} className="flex items-center gap-2">
                  {recipe.name}
                  {recipe.isAlternate && (
                    <span className="text-xs font-bold uppercase text-muted-foreground border rounded px-1">
                      alt
                    </span>
                  )}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatItems(recipe.inputs)}</TableCell>
              <TableCell>{recipe.machine}</TableCell>
              <TableCell>{formatItems(recipe.outputs)}</TableCell>
              <TableCell className="text-muted-foreground">{recipe.unlockedBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
