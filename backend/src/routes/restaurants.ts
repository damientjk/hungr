import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getNearbyRestaurants,
  getLikedRestaurants,
  recordSwipe,
  resetSwipes,
} from "../controllers/restaurants";

const router = Router();

router.use(requireAuth);

router.get("/nearby", getNearbyRestaurants);
router.get("/liked", getLikedRestaurants);
router.post("/swipe", recordSwipe);
router.delete("/swipes", resetSwipes);

export default router;
