import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler.middleware";

const router = Router();
const controller = new NotificationController();

router.use(authenticate);
router.get("/", asyncHandler((req, res) => controller.list(req, res)));
router.patch("/:id/read", asyncHandler((req, res) => controller.markAsRead(req, res)));

export default router;
