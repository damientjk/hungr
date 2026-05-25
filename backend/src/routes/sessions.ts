import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getSession,
  createSession,
  joinSession,
  startSwiping,
  getSessionRestaurants,
  refreshSessionRestaurants,
  getSessionMatches,
} from "../controllers/sessions";

const router = Router();

router.use(requireAuth);

router.post("/", createSession);
router.post("/join/:code", joinSession);
router.get("/:id", getSession);
router.patch("/:id/start", startSwiping);
router.get("/:id/restaurants", getSessionRestaurants);
router.post("/:id/restaurants", refreshSessionRestaurants);
router.get("/:id/matches", getSessionMatches);

export default router;
