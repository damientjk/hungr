import { supabase } from "./supabase";
import { fetchAllNearbyRestaurants } from "./places";

type PlaceRow = Awaited<ReturnType<typeof fetchAllNearbyRestaurants>>[number];

/**
 * Upsert fetched places, merging `cuisines` with whatever's already stored
 * instead of overwriting it — an untagged fetch would otherwise wipe out
 * dietary tags (halal/vegetarian/vegan) stamped by an earlier tagged search.
 */
export async function upsertRestaurants(places: PlaceRow[]) {
  if (places.length === 0) return { error: null };

  const { data: existing } = await supabase
    .from("restaurants")
    .select("place_id, cuisines")
    .in("place_id", places.map((p) => p.place_id));

  const existingCuisines = new Map((existing ?? []).map((r) => [r.place_id, r.cuisines ?? []]));

  const merged = places.map((p) => ({
    ...p,
    cuisines: [...new Set([...(existingCuisines.get(p.place_id) ?? []), ...p.cuisines])],
  }));

  return supabase.from("restaurants").upsert(merged, { onConflict: "place_id", ignoreDuplicates: false });
}
