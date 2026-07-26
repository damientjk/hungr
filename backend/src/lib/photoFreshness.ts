import { supabase } from "./supabase";
import { refreshPlacePhoto } from "./places";

/**
 * Restaurants are only re-fetched from Places when an area has too few cached
 * results (see seedSessionRestaurants/getNearbyRestaurants) — an established
 * area's rows are otherwise never touched again, so their cached photo_url
 * (which bakes in a Google photo_reference token) can go stale indefinitely.
 * Re-check anything older than this on read and repair it in place.
 */
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Refresh `photo_url` for any restaurant in `rows` that hasn't been
 * re-checked recently. Mutates matching rows in place and persists the
 * refreshed URL to the `restaurants` table so later reads stay fresh too.
 */
export async function refreshStalePhotos<T extends { id: string; photo_url: string | null }>(
  rows: T[]
): Promise<void> {
  if (rows.length === 0) return;

  const { data: meta } = await supabase
    .from("restaurants")
    .select("id, place_id, updated_at")
    .in("id", rows.map((r) => r.id));

  const now = Date.now();
  const stale = (meta ?? []).filter(
    (m) => now - new Date(m.updated_at).getTime() > STALE_AFTER_MS
  );
  if (stale.length === 0) return;

  await Promise.all(
    stale.map(async (m) => {
      const freshUrl = await refreshPlacePhoto(m.place_id);

      const { error } = await supabase
        .from("restaurants")
        .update({ photo_url: freshUrl, updated_at: new Date().toISOString() })
        .eq("id", m.id);
      if (error) {
        console.error(`Failed to persist refreshed photo for ${m.id}:`, error);
        return;
      }

      const row = rows.find((r) => r.id === m.id);
      if (row) row.photo_url = freshUrl;
    })
  );
}
