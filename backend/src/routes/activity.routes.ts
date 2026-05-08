import { Router } from "express";
import { ActivityController } from "../controllers/activity.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";

const router = Router();
const controller = new ActivityController();

router.use(authenticate);
router.get("/", asyncHandler((req, res) => controller.list(req, res)));

export default router;
