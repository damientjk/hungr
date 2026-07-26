import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { touchParticipant, maybeTransferStaleOwnership } from "../lib/presence";
import {
  getSession,
  getSessionParticipants,
  getCurrentSession,
  createSession,
  joinSession,
  startSwiping,
  endSession,
  leaveSession,
  kickParticipant,
  listUserSessions,
  getSessionRestaurants,
  refreshSessionRestaurants,
  getSessionMatches,
} from "../controllers/sessions";

const router = Router();

router.use(requireAuth);

// Runs for every route with an :id param — keeps presence fresh and lazily
// repairs a session whose owner has gone quiet, without a separate poller.
router.param("id", async (req: AuthRequest, res, next, id) => {
  if (req.userId) {
    await touchParticipant(id, req.userId).catch(() => {});
    await maybeTransferStaleOwnership(id).catch(() => {});
  }
  next();
});

router.get("/", listUserSessions);
router.post("/", createSession);
router.get("/current", getCurrentSession);
router.post("/join/:code", joinSession);
router.get("/:id", getSession);
router.get("/:id/participants", getSessionParticipants);
router.patch("/:id/start", startSwiping);
router.get("/:id/restaurants", getSessionRestaurants);
router.post("/:id/restaurants", refreshSessionRestaurants);
router.get("/:id/matches", getSessionMatches);
router.patch("/:id/end", endSession);
router.post("/:id/leave", leaveSession);
router.post("/:id/kick", kickParticipant);

export default router;
