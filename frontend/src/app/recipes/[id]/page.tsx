export const dynamic = "force-dynamic";

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

async function getRecipe(id: string): Promise<Recipe> {
  const res = await fetch(`http://localhost:3001/api/recipes/${id}`, { cache: "no-store" });
  return res.json();
}

function ItemList({ json }: { json: string }) {
  const items: RecipeItem[] = JSON.parse(json);
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.item} className="flex items-center justify-between rounded-md border px-4 py-2">
          <span className="font-medium">{item.item}</span>
          <div className="text-sm text-muted-foreground text-right">
            <span>{item.amount} ×</span>
            <span className="ml-3">{item.ratePerMin} / min</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{recipe.name}</h1>
          {recipe.isAlternate && (
            <span className="text-xs font-bold uppercase border rounded px-2 py-0.5 text-muted-foreground">
              Alternate
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {recipe.machine} · {recipe.duration}s · Unlocked by {recipe.unlockedBy}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ingredients</h2>
        <ItemList json={recipe.inputs} />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Products</h2>
        <ItemList json={recipe.outputs} />
      </div>
    </div>
  );
}
