import { Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";

const BookmarkSchema = z.object({
  restaurantId: z.string().uuid(),
});

export async function getBookmarks(req: AuthRequest, res: Response) {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("restaurants(*), created_at")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getBookmarks error:", error);
    res.status(500).json({ error: error.message ?? "Failed to fetch bookmarks" });
    return;
  }

  res.json({ bookmarks: data?.map((d: any) => d.restaurants) ?? [] });
}

export async function addBookmark(req: AuthRequest, res: Response) {
  const parsed = BookmarkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { error } = await supabase.from("bookmarks").upsert(
    {
      user_id: req.userId,
      restaurant_id: parsed.data.restaurantId,
    },
    { onConflict: "user_id,restaurant_id" }
  );

  if (error) {
    console.error("addBookmark error:", error);
    res.status(500).json({ error: error.message ?? "Failed to add bookmark" });
    return;
  }

  res.json({ success: true });
}

export async function removeBookmark(req: AuthRequest, res: Response) {
  const { restaurantId } = req.params;

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", req.userId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    res.status(500).json({ error: "Failed to remove bookmark" });
    return;
  }

  res.json({ success: true });
}
