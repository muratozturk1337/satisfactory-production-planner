export const dynamic = "force-dynamic";

import RecipesTable from "./recipes-table";

async function getRecipes() {
  const res = await fetch("http://localhost:3001/api/recipes", { cache: "no-store" });
  return res.json();
}

export default async function RecipesPage() {
  const recipes = await getRecipes();
  return <RecipesTable recipes={recipes} />;
}
