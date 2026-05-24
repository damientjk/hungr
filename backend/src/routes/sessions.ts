import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createSession,
  joinSession,
  getSessionMatches,
} from "../controllers/sessions";

const router = Router();

router.use(requireAuth);

router.post("/", createSession);
router.post("/join/:code", joinSession);
router.get("/:id/matches", getSessionMatches);

export default router;
