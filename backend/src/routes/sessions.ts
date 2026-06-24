import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getSession,
  createSession,
  joinSession,
  startSwiping,
  endSession,
  listUserSessions,
  getSessionRestaurants,
  refreshSessionRestaurants,
  getSessionMatches,
} from "../controllers/sessions";

const router = Router();

router.use(requireAuth);

router.get("/", listUserSessions);
router.post("/", createSession);
router.post("/join/:code", joinSession);
router.get("/:id", getSession);
router.patch("/:id/start", startSwiping);
router.get("/:id/restaurants", getSessionRestaurants);
router.post("/:id/restaurants", refreshSessionRestaurants);
router.get("/:id/matches", getSessionMatches);
router.patch("/:id/end", endSession);

export default router;
