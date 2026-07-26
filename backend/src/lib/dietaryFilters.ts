import { SearchTag } from "./places";

export interface DietaryFilters {
  cuisineFilters: string[];
  halal: boolean;
  vegetarian: boolean;
  vegan: boolean;
}

export function effectiveCuisineFilters(f: DietaryFilters): string[] {
  const arr = [...f.cuisineFilters];
  if (f.halal) arr.push("halal");
  if (f.vegetarian) arr.push("vegetarian");
  if (f.vegan) arr.push("vegan");
  return arr;
}

export function buildSearchTags(f: DietaryFilters): SearchTag[] {
  const tags: SearchTag[] = f.cuisineFilters.map((c) => ({ keyword: c, label: c }));
  if (f.halal) tags.push({ keyword: "halal", label: "halal" });
  if (f.vegetarian) tags.push({ keyword: "vegetarian", label: "vegetarian" });
  if (f.vegan) tags.push({ keyword: "vegan", label: "vegan" });
  return tags;
}
