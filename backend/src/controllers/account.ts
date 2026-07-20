import { Response } from "express";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";

// Wipes all of the caller's activity data: swipes, bookmarks, and session
// history. Leaves the sessions themselves and the auth account untouched,
// since a session may still be shared with other participants.
export async function resetAccountData(req: AuthRequest, res: Response) {
  const userId = req.userId;

  const [swipes, bookmarks, participants] = await Promise.all([
    supabase.from("swipes").delete().eq("user_id", userId),
    supabase.from("bookmarks").delete().eq("user_id", userId),
    supabase.from("session_participants").delete().eq("user_id", userId),
  ]);

  const error = swipes.error ?? bookmarks.error ?? participants.error;
  if (error) {
    console.error("resetAccountData error:", error);
    res.status(500).json({ error: "Failed to reset account data" });
    return;
  }

  res.json({ success: true });
}
