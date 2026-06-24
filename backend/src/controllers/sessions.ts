import { Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";
import { fetchAllNearbyRestaurants, SearchTag } from "../lib/places";
import { geocodeAddress } from "../lib/geocode";

const CreateSessionSchema = z.object({
  name: z.string().min(1).max(100),
  cuisineFilters: z.array(z.string()).default([]),
  maxDistance: z.number().min(1000).max(50000).default(5000),
});

// ── Filters ───────────────────────────────────────────────────────────────
interface SessionFilters {
  cuisineFilters: string[];
  priceMin: number;
  priceMax: number;
  halal: boolean;
  vegetarian: boolean;
}

/** Normalise cuisine labels: lowercase, trimmed, de-duplicated, non-empty. */
function normaliseCuisines(cuisines: string[]): string[] {
  return [...new Set(cuisines.map((c) => c.trim().toLowerCase()).filter(Boolean))];
}

/** Cuisine labels plus any dietary flags, used for DB-side filtering. */
function effectiveCuisineFilters(f: SessionFilters): string[] {
  const arr = [...f.cuisineFilters];
  if (f.halal) arr.push("halal");
  if (f.vegetarian) arr.push("vegetarian");
  return arr;
}

/** Keyword searches to run against Places to populate tagged restaurants. */
function buildSearchTags(f: SessionFilters): SearchTag[] {
  const tags: SearchTag[] = f.cuisineFilters.map((c) => ({ keyword: c, label: c }));
  if (f.halal) tags.push({ keyword: "halal", label: "halal" });
  if (f.vegetarian) tags.push({ keyword: "vegetarian", label: "vegetarian" });
  return tags;
}

export async function getSession(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Verify requester is a participant or owner
  const { data: participant } = await supabase
    .from("session_participants")
    .select("user_id")
    .eq("session_id", id)
    .eq("user_id", req.userId)
    .single();

  if (!participant && session.owner_id !== req.userId) {
    res.status(403).json({ error: "Not a session participant" });
    return;
  }

  res.json({ session });
}

export async function createSession(req: AuthRequest, res: Response) {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      owner_id: req.userId,
      name: parsed.data.name,
      cuisine_filters: parsed.data.cuisineFilters,
      max_distance: parsed.data.maxDistance,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to create session" });
    return;
  }

  // Add owner as first participant
  await supabase.from("session_participants").insert({
    session_id: data.id,
    user_id: req.userId,
  });

  res.status(201).json({ session: data });
}

export async function joinSession(req: AuthRequest, res: Response) {
  const { code } = req.params;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("invite_code", code)
    .in("status", ["active", "swiping"])
    .single();

  if (sessionError || !session) {
    res.status(404).json({ error: "Session not found or no longer active" });
    return;
  }

  const { error } = await supabase.from("session_participants").upsert({
    session_id: session.id,
    user_id: req.userId,
  });

  if (error) {
    res.status(500).json({ error: "Failed to join session" });
    return;
  }

  res.json({ session });
}

// Owner-configurable filters accepted when starting a session.
const StartSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // Optional free-text location to centre the search on instead of the device.
  address: z.string().trim().min(1).max(200).optional(),
  cuisineFilters: z.array(z.string()).max(40).default([]),
  priceMin: z.coerce.number().int().min(1).max(4).default(1),
  priceMax: z.coerce.number().int().min(1).max(4).default(4),
  halal: z.boolean().default(false),
  vegetarian: z.boolean().default(false),
  maxDistance: z.coerce.number().min(1000).max(50000).default(5000),
});

// Fetch nearby restaurants into DB if needed, then store top N in session_restaurants
async function seedSessionRestaurants(
  sessionId: string,
  latitude: number,
  longitude: number,
  radius: number,
  filters: SessionFilters
) {
  // Use a non-existent user ID so no per-user swipes are excluded
  const NOBODY = "00000000-0000-0000-0000-000000000000";

  const cuisineArr = effectiveCuisineFilters(filters);
  const rpcArgs = {
    lat: latitude,
    lng: longitude,
    radius_meters: radius,
    exclude_user_id: NOBODY,
    cuisine_filters: cuisineArr.length > 0 ? cuisineArr : null,
    price_min: filters.priceMin,
    price_max: filters.priceMax,
  };

  const { data: existing } = await supabase.rpc("restaurants_near_point", rpcArgs);

  if ((existing?.length ?? 0) < 20) {
    try {
      const tags = buildSearchTags(filters);
      const places = await fetchAllNearbyRestaurants(latitude, longitude, radius, tags);
      if (places.length > 0) {
        await supabase
          .from("restaurants")
          .upsert(places, { onConflict: "place_id", ignoreDuplicates: false });
      }
    } catch (e) {
      console.error("Places API fetch failed:", e);
    }
  }

  const { data: nearby } = await supabase.rpc("restaurants_near_point", rpcArgs);

  const batch = (nearby ?? []).slice(0, 20);

  // Replace the current batch
  await supabase.from("session_restaurants").delete().eq("session_id", sessionId);
  if (batch.length === 0) return batch;

  const { error: insertError } = await supabase.from("session_restaurants").insert(
    batch.map((r: any, i: number) => ({
      session_id: sessionId,
      restaurant_id: r.id,
      position: i,
      distance_meters: r.distance_meters,
    }))
  );
  if (insertError) throw new Error(`Failed to seed session restaurants: ${insertError.message}`);

  return batch;
}

export async function startSwiping(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "latitude and longitude are required" });
    return;
  }
  const input = parsed.data;

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("owner_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.owner_id !== req.userId) {
    res.status(403).json({ error: "Only the session owner can start swiping" });
    return;
  }

  if (session.status !== "active") {
    res.status(400).json({ error: "Session has already started" });
    return;
  }

  // Resolve the search centre: a custom address (looked up via Places, biased
  // toward the device location) or the device location itself.
  let { latitude, longitude } = input;
  if (input.address) {
    const geo = await geocodeAddress(input.address, {
      latitude: input.latitude,
      longitude: input.longitude,
    });
    if (!geo) {
      res.status(400).json({
        error: `Couldn't find "${input.address}". Try a more specific place or address.`,
      });
      return;
    }
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  // Clamp price range and normalise cuisines.
  const priceMin = Math.min(input.priceMin, input.priceMax);
  const priceMax = Math.max(input.priceMin, input.priceMax);
  const filters: SessionFilters = {
    cuisineFilters: normaliseCuisines(input.cuisineFilters),
    priceMin,
    priceMax,
    halal: input.halal,
    vegetarian: input.vegetarian,
  };

  // Persist the chosen filters so member re-fetches use the same criteria.
  await supabase
    .from("sessions")
    .update({
      cuisine_filters: filters.cuisineFilters,
      price_min: filters.priceMin,
      price_max: filters.priceMax,
      halal: filters.halal,
      vegetarian: filters.vegetarian,
      max_distance: input.maxDistance,
    })
    .eq("id", id);

  let batch;
  try {
    batch = await seedSessionRestaurants(id, latitude, longitude, input.maxDistance, filters);
  } catch (e: any) {
    console.error("seedSessionRestaurants failed:", e);
    res.status(500).json({ error: e.message ?? "Failed to load restaurants for session" });
    return;
  }

  if (!batch || batch.length === 0) {
    res.status(400).json({
      error: "No restaurants match these filters. Try widening the distance, price, or cuisine.",
    });
    return;
  }

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({ status: "swiping" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to start swiping" });
    return;
  }

  res.json({ session: updated });
}

export async function getSessionRestaurants(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: rows, error: rowsError } = await supabase
    .from("session_restaurants")
    .select("restaurant_id, position, distance_meters")
    .eq("session_id", id)
    .order("position");

  if (rowsError) {
    console.error("getSessionRestaurants error:", rowsError);
    res.status(500).json({ error: "Failed to fetch session restaurants" });
    return;
  }

  if (!rows || rows.length === 0) {
    res.json({ restaurants: [] });
    return;
  }

  const ids = rows.map((r: any) => r.restaurant_id);
  const distanceBy = new Map(rows.map((r: any) => [r.restaurant_id, r.distance_meters]));
  const positionBy = new Map(rows.map((r: any) => [r.restaurant_id, r.position]));

  const { data: rests, error: restsError } = await supabase
    .from("restaurants")
    .select("id, name, cuisines, rating, price_level, photo_url, address")
    .in("id", ids);

  if (restsError) {
    console.error("getSessionRestaurants restaurants error:", restsError);
    res.status(500).json({ error: "Failed to fetch session restaurants" });
    return;
  }

  const restaurants = (rests ?? [])
    .map((r: any) => ({ ...r, distance_meters: distanceBy.get(r.id) ?? null }))
    .sort((a: any, b: any) => (positionBy.get(a.id) ?? 0) - (positionBy.get(b.id) ?? 0));

  res.json({ restaurants });
}

export async function refreshSessionRestaurants(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const parsed = z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "latitude and longitude are required" });
    return;
  }
  const { latitude, longitude } = parsed.data;

  // Only the owner can trigger a new batch
  const { data: session } = await supabase
    .from("sessions")
    .select("owner_id, cuisine_filters, max_distance, price_min, price_max, halal, vegetarian")
    .eq("id", id)
    .single();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.owner_id !== req.userId) {
    res.status(403).json({ error: "Only the session owner can try another batch" });
    return;
  }

  // Clear all swipes so every member's done status resets for the new batch
  await supabase.from("swipes").delete().eq("session_id", id);

  const filters: SessionFilters = {
    cuisineFilters: session?.cuisine_filters ?? [],
    priceMin: session?.price_min ?? 1,
    priceMax: session?.price_max ?? 4,
    halal: session?.halal ?? false,
    vegetarian: session?.vegetarian ?? false,
  };

  await seedSessionRestaurants(id, latitude, longitude, session?.max_distance ?? 5000, filters);

  // Re-use the same two-query approach as getSessionRestaurants
  const { data: rows } = await supabase
    .from("session_restaurants")
    .select("restaurant_id, position, distance_meters")
    .eq("session_id", id)
    .order("position");

  const ids = (rows ?? []).map((r: any) => r.restaurant_id);
  const distanceBy = new Map((rows ?? []).map((r: any) => [r.restaurant_id, r.distance_meters]));
  const positionBy = new Map((rows ?? []).map((r: any) => [r.restaurant_id, r.position]));

  const { data: rests } = await supabase
    .from("restaurants")
    .select("id, name, cuisines, rating, price_level, photo_url, address")
    .in("id", ids);

  const restaurants = (rests ?? [])
    .map((r: any) => ({ ...r, distance_meters: distanceBy.get(r.id) ?? null }))
    .sort((a: any, b: any) => (positionBy.get(a.id) ?? 0) - (positionBy.get(b.id) ?? 0));

  res.json({ restaurants });
}

export async function endSession(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("owner_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.owner_id !== req.userId) {
    res.status(403).json({ error: "Only the session owner can end the session" });
    return;
  }

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({ status: "closed" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to end session" });
    return;
  }

  res.json({ session: updated });
}

export async function listUserSessions(req: AuthRequest, res: Response) {
  // Find all session IDs this user participates in
  const { data: participations } = await supabase
    .from("session_participants")
    .select("session_id")
    .eq("user_id", req.userId);

  const sessionIds = (participations ?? []).map((p: any) => p.session_id);

  if (sessionIds.length === 0) {
    res.json({ sessions: [] });
    return;
  }

  // Fetch closed sessions the user is part of
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, name, created_at, owner_id")
    .in("id", sessionIds)
    .eq("status", "closed")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to fetch sessions" });
    return;
  }

  if (!sessions || sessions.length === 0) {
    res.json({ sessions: [] });
    return;
  }

  // Participant counts in one query
  const { data: participantRows } = await supabase
    .from("session_participants")
    .select("session_id")
    .in("session_id", sessions.map((s: any) => s.id));

  const countBySession = new Map<string, number>();
  for (const row of participantRows ?? []) {
    countBySession.set(row.session_id, (countBySession.get(row.session_id) ?? 0) + 1);
  }

  // Top match name per session (best-effort; skip on error)
  const topMatchNames = new Map<string, string | null>();
  await Promise.all(
    sessions.map(async (s: any) => {
      try {
        const { data: matches } = await supabase.rpc("get_session_matches", {
          session_id: s.id,
        });
        topMatchNames.set(s.id, matches?.[0]?.name ?? null);
      } catch {
        topMatchNames.set(s.id, null);
      }
    })
  );

  const result = sessions.map((s: any) => ({
    id: s.id,
    name: s.name,
    created_at: s.created_at,
    owner_id: s.owner_id,
    participant_count: countBySession.get(s.id) ?? 0,
    top_match_name: topMatchNames.get(s.id) ?? null,
  }));

  res.json({ sessions: result });
}

export async function getSessionMatches(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // Count participants
  const { data: participants } = await supabase
    .from("session_participants")
    .select("user_id")
    .eq("session_id", id);

  const participantCount = participants?.length ?? 0;
  const userIds = (participants ?? []).map((p: any) => p.user_id);

  // How many restaurants are in this session's batch
  const { count: restaurantCount } = await supabase
    .from("session_restaurants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", id);

  // How many swipes each participant has made in this session
  const { data: allSwipes } = await supabase
    .from("swipes")
    .select("user_id")
    .eq("session_id", id)
    .in("user_id", userIds);

  const swipesByUser = new Map<string, number>();
  for (const s of allSwipes ?? []) {
    swipesByUser.set(s.user_id, (swipesByUser.get(s.user_id) ?? 0) + 1);
  }

  const total = restaurantCount ?? 0;
  const doneCount = userIds.filter(uid => (swipesByUser.get(uid) ?? 0) >= total).length;
  const allDone = total > 0 && participantCount > 0 && doneCount >= participantCount;

  // Unanimous matches (every participant liked it)
  const { data: matches, error } = await supabase.rpc("get_session_matches", {
    session_id: id,
  });

  if (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
    return;
  }

  // If no unanimous match, find the restaurant with the most likes across members
  let topMatch = null;
  if (!matches || matches.length === 0) {
    const { data: likes } = await supabase
      .from("swipes")
      .select("restaurant_id, user_id")
      .in("user_id", userIds)
      .eq("direction", "like")
      .eq("session_id", id);

    if (likes && likes.length > 0) {
      const counts = new Map<string, Set<string>>();
      for (const { restaurant_id, user_id } of likes) {
        if (!counts.has(restaurant_id)) counts.set(restaurant_id, new Set());
        counts.get(restaurant_id)!.add(user_id);
      }

      const topId = [...counts.entries()]
        .sort((a, b) => b[1].size - a[1].size)[0]?.[0];

      if (topId) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, name, cuisines, rating, price_level, photo_url, address")
          .eq("id", topId)
          .single();

        if (restaurant) {
          topMatch = { ...restaurant, likeCount: counts.get(topId)!.size };
        }
      }
    }
  }

  res.json({ matches: matches ?? [], topMatch, participantCount, doneCount, allDone });
}
