import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { resetAccountData } from "../controllers/account";

const router = Router();
router.use(requireAuth);

router.delete("/data", resetAccountData);

export default router;
