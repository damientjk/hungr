import { Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { fetchAllNearbyRestaurants } from "../lib/places";
import { autocompletePlaces } from "../lib/geocode";
import { AuthRequest } from "../middleware/auth";

const AutocompleteSchema = z.object({
  input: z.string().min(1).max(200),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export async function getPlaceAutocomplete(req: AuthRequest, res: Response) {
  const parsed = AutocompleteSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "input is required" });
    return;
  }
  const { input, latitude, longitude } = parsed.data;
  const bias =
    latitude !== undefined && longitude !== undefined
      ? { latitude, longitude }
      : undefined;
  const suggestions = await autocompletePlaces(input, bias);
  res.json({ suggestions });
}

const NearbySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50000).default(5000),
  cuisine: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export async function getNearbyRestaurants(req: AuthRequest, res: Response) {
  const parsed = NearbySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { latitude, longitude, radius, cuisine, limit } = parsed.data;

  // Check how many restaurants we already have near this location
  const { data: existing } = await supabase.rpc("restaurants_near_point", {
    lat: latitude,
    lng: longitude,
    radius_meters: radius,
    exclude_user_id: req.userId,
    cuisine_filters: null,
  });
  const nearbyCount = existing?.length ?? 0;

  // Fetch from Google Places if we don't have enough local results
  if (nearbyCount < 20) {
    try {
      const allPlaces = await fetchAllNearbyRestaurants(latitude, longitude, radius);
      console.log(`Fetched ${allPlaces.length} restaurants from Places API`);
      if (allPlaces.length > 0) {
        const { error: upsertError } = await supabase
          .from("restaurants")
          .upsert(allPlaces, { onConflict: "place_id", ignoreDuplicates: false });
        if (upsertError) console.error("Upsert error:", upsertError);
      }
    } catch (e) {
      console.error("Places API fetch failed:", e);
    }
  }

  // Query from Supabase via PostGIS RPC, excluding already-swiped restaurants
  const { data, error } = await supabase.rpc("restaurants_near_point", {
    lat: latitude,
    lng: longitude,
    radius_meters: radius,
    exclude_user_id: req.userId,
    cuisine_filters: cuisine ? [cuisine.toLowerCase()] : null,
  });

  if (error) {
    console.error("RPC error:", error);
    res.status(500).json({ error: "Failed to fetch restaurants" });
    return;
  }

  const results = limit ? (data ?? []).slice(0, limit) : (data ?? []);
  res.json({ restaurants: results });
}

const SwipeSchema = z.object({
  restaurantId: z.string().uuid(),
  direction: z.enum(["like", "dislike"]),
  sessionId: z.string().uuid(),
});

export async function recordSwipe(req: AuthRequest, res: Response) {
  const parsed = SwipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { restaurantId, direction, sessionId } = parsed.data;

  const { error } = await supabase.from("swipes").upsert(
    {
      user_id: req.userId,
      restaurant_id: restaurantId,
      session_id: sessionId,
      direction,
      swiped_at: new Date().toISOString(),
    },
    { onConflict: "user_id, restaurant_id, session_id" }
  );

  if (error) {
    console.error("Swipe error:", error);
    res.status(500).json({ error: "Failed to record swipe" });
    return;
  }

  res.json({ success: true });
}

export async function resetSwipes(req: AuthRequest, res: Response) {
  const { error } = await supabase
    .from("swipes")
    .delete()
    .eq("user_id", req.userId);

  if (error) {
    console.error("Reset swipes error:", error);
    res.status(500).json({ error: "Failed to reset swipes" });
    return;
  }

  res.json({ success: true });
}

export async function getLikedRestaurants(req: AuthRequest, res: Response) {
  const { data, error } = await supabase
    .from("swipes")
    .select("restaurants(*), direction, swiped_at")
    .eq("user_id", req.userId)
    .in("direction", ["like"])
    .order("swiped_at", { ascending: false });

  if (error) {
    console.error("Liked restaurants error:", error);
    res.status(500).json({ error: "Failed to fetch liked restaurants" });
    return;
  }

  res.json({ restaurants: data.map((d: any) => d.restaurants) });
}
