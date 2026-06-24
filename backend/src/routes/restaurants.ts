import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getNearbyRestaurants,
  getLikedRestaurants,
  recordSwipe,
  resetSwipes,
  getPlaceAutocomplete,
} from "../controllers/restaurants";

const router = Router();

router.use(requireAuth);

router.get("/nearby", getNearbyRestaurants);
router.get("/autocomplete", getPlaceAutocomplete);
router.get("/liked", getLikedRestaurants);
router.post("/swipe", recordSwipe);
router.delete("/swipes", resetSwipes);

export default router;
