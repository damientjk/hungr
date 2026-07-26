import { Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { AuthRequest } from "../middleware/auth";

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export async function listFolders(req: AuthRequest, res: Response) {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, created_at")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: "Failed to fetch folders" });
    return;
  }

  // Attach restaurant count per folder
  const folderIds = (data ?? []).map((f: any) => f.id);
  let countMap = new Map<string, number>();

  if (folderIds.length > 0) {
    const { data: counts } = await supabase
      .from("bookmarks")
      .select("folder_id")
      .eq("user_id", req.userId)
      .in("folder_id", folderIds);

    for (const row of counts ?? []) {
      countMap.set(row.folder_id, (countMap.get(row.folder_id) ?? 0) + 1);
    }
  }

  const folders = (data ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    created_at: f.created_at,
    count: countMap.get(f.id) ?? 0,
  }));

  res.json({ folders });
}

export async function createFolder(req: AuthRequest, res: Response) {
  const parsed = CreateFolderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: req.userId, name: parsed.data.name })
    .select("id, name, created_at")
    .single();

  if (error) {
    res.status(500).json({ error: "Failed to create folder" });
    return;
  }

  res.json({ folder: { ...data, count: 0 } });
}

export async function deleteFolder(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", req.userId);

  if (error) {
    res.status(500).json({ error: "Failed to delete folder" });
    return;
  }

  res.json({ success: true });
}

export async function setBookmarkFolder(req: AuthRequest, res: Response) {
  const { restaurantId } = req.params;
  const { folderId } = req.body; // null to remove from folder

  if (folderId !== null && folderId !== undefined) {
    // Verify the folder belongs to the user
    const { data: folder } = await supabase
      .from("folders")
      .select("id")
      .eq("id", folderId)
      .eq("user_id", req.userId)
      .single();

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }
  }

  const { error } = await supabase
    .from("bookmarks")
    .update({ folder_id: folderId ?? null })
    .eq("user_id", req.userId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    res.status(500).json({ error: "Failed to update bookmark folder" });
    return;
  }

  res.json({ success: true });
}
