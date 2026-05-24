import { Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";

const NearbySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50000).default(5000),
  cuisine: z.string().optional(),
});

export async function getNearbyRestaurants(req: AuthRequest, res: Response) {
  const parsed = NearbySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { latitude, longitude, radius, cuisine } = parsed.data;

  // Fetch restaurants from Supabase, excluding ones the user already swiped
  let query = supabase
    .from("restaurants")
    .select("*")
    .not(
      "id",
      "in",
      `(select restaurant_id from swipes where user_id = '${req.userId}')`
    );

  if (cuisine) {
    query = query.contains("cuisines", [cuisine]);
  }

  // PostGIS distance filter via RPC
  const { data, error } = await supabase.rpc("restaurants_near_point", {
    lat: latitude,
    lng: longitude,
    radius_meters: radius,
    exclude_user_id: req.userId,
    cuisine_filter: cuisine ?? null,
  });

  if (error) {
    res.status(500).json({ error: "Failed to fetch restaurants" });
    return;
  }

  res.json({ restaurants: data });
}

const SwipeSchema = z.object({
  restaurantId: z.string().uuid(),
  direction: z.enum(["like", "dislike"]),
});

export async function recordSwipe(req: AuthRequest, res: Response) {
  const parsed = SwipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { restaurantId, direction } = parsed.data;

  const { error } = await supabase.from("swipes").upsert({
    user_id: req.userId,
    restaurant_id: restaurantId,
    direction,
    swiped_at: new Date().toISOString(),
  });

  if (error) {
    res.status(500).json({ error: "Failed to record swipe" });
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
    res.status(500).json({ error: "Failed to fetch liked restaurants" });
    return;
  }

  res.json({ restaurants: data });
}
