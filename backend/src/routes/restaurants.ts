import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getNearbyRestaurants,
  getLikedRestaurants,
  recordSwipe,
} from "../controllers/restaurants";

const router = Router();

router.use(requireAuth);

router.get("/nearby", getNearbyRestaurants);
router.get("/liked", getLikedRestaurants);
router.post("/swipe", recordSwipe);

export default router;
