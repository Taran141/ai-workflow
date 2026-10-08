import { Router } from "express";
import { ActivityController } from "../controllers/activity.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";
import { validate } from "../middleware/validation.middleware";
import { listActivitySchema } from "../validators/activity.validator";

const router = Router();
const controller = new ActivityController();

router.use(authenticate);
router.get("/", validate(listActivitySchema), asyncHandler((req, res) => controller.list(req, res)));

export default router;
