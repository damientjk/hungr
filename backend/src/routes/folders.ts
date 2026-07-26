import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listFolders, createFolder, deleteFolder, setBookmarkFolder } from "../controllers/folders";

const router = Router();
router.use(requireAuth);
router.get("/", listFolders);
router.post("/", createFolder);
router.delete("/:id", deleteFolder);
router.patch("/bookmarks/:restaurantId", setBookmarkFolder);

export default router;
