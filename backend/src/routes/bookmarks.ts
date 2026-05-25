import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getBookmarks, addBookmark, removeBookmark } from "../controllers/bookmarks";

const router = Router();
router.use(requireAuth);
router.get("/", getBookmarks);
router.post("/", addBookmark);
router.delete("/:restaurantId", removeBookmark);

export default router;
